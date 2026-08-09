import os
import shutil
from typing import List, Optional
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
# pyrefly: ignore [missing-import]
from fastapi.responses import FileResponse
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.test import Test, AnswerKey
from app.models.evaluation import Evaluation, EvaluationAnswer
from app.schemas.evaluation import (
    EvaluationResponse, EvaluationSummaryResponse,
    ManualCorrectionRequest, FinalizeRequest
)
from app.services.omr.template import ensure_default_template
from app.services.omr.pipeline import process_omr_image
from app.services.scoring.calculator import calculate_score
from app.services.scoring.rules import RESULT_AMBIGUOUS

router = APIRouter(prefix="/api", tags=["evaluations"])


@router.get("/tests/{test_id}/evaluations", response_model=List[EvaluationSummaryResponse])
def list_evaluations(test_id: int, db: Session = Depends(get_db)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    evals = db.query(Evaluation).filter(Evaluation.test_id == test_id)\
        .order_by(Evaluation.created_at.desc()).all()
    return evals


@router.get("/evaluations/{evaluation_id}", response_model=EvaluationResponse)
def get_evaluation(evaluation_id: int, db: Session = Depends(get_db)):
    ev = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return ev


@router.delete("/evaluations/{evaluation_id}", status_code=204)
def delete_evaluation(evaluation_id: int, db: Session = Depends(get_db)):
    ev = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    db.delete(ev)
    db.commit()


@router.post("/tests/{test_id}/evaluate")
async def evaluate_omr(
    test_id: int,
    file: UploadFile = File(...),
    template_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Upload an OMR image and process it against the test's answer key.
    Returns detection results (draft evaluation) for user review.
    """
    # 1. Verify test and answer key exist
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    answer_keys = db.query(AnswerKey).filter(AnswerKey.test_id == test_id).all()
    if not answer_keys:
        raise HTTPException(
            status_code=422,
            detail="No answer key uploaded for this test. Please upload an answer key first."
        )

    import uuid
    upload_id = uuid.uuid4().hex

    # 2. Save uploaded file
    eval_dir = settings.EVALUATIONS_DIR / "tmp" / upload_id
    eval_dir.mkdir(parents=True, exist_ok=True)
    original_ext = os.path.splitext(file.filename or "upload.jpg")[1] or ".jpg"
    original_path = eval_dir / f"original{original_ext}"

    with open(original_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # 3. Load template
    template = ensure_default_template(settings.TEMPLATES_DIR)

    # 4. Build answer key dict
    answer_key_dict = {ak.question_number: ak.correct_answer for ak in answer_keys}

    # 5. Process OMR
    result = process_omr_image(
        image_path=str(original_path),
        template=template,
        total_questions=test.total_questions,
        answer_key=answer_key_dict,
        output_dir=str(eval_dir),
        generate_debug_image=True,
        generate_bubble_crops=True,
    )

    if not result.success:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "OMR processing failed",
                "error": result.error,
                "steps": [{"name": s.name, "status": s.status, "message": s.message} for s in result.steps],
                "warnings": result.warnings,
            }
        )

    # 6. Create draft evaluation in database
    eval_dir_final = settings.EVALUATIONS_DIR / f"draft_{upload_id}"
    eval_dir_final.mkdir(parents=True, exist_ok=True)

    final_original = eval_dir_final / f"original{original_ext}"
    shutil.copy(str(original_path), str(final_original))

    processed_path = None
    if result.processed_path:
        final_processed = eval_dir_final / "processed.jpg"
        shutil.copy(result.processed_path, str(final_processed))
        processed_path = str(final_processed)

    # Calculate initial score
    detection_methods = {q: "AUTO" for q in result.detected_answers}
    score_summary = calculate_score(
        result.detected_answers,
        answer_key_dict,
        result.confidences,
        detection_methods,
        test.correct_marks,
        test.wrong_marks,
        test.e_marks,
        test.unanswered_marks,
    )

    evaluation = Evaluation(
        test_id=test_id,
        source_file=str(final_original),
        processed_file=processed_path,
        total_marks=score_summary.total_marks,
        correct_count=score_summary.correct_count,
        wrong_count=score_summary.wrong_count,
        e_count=score_summary.e_count,
        unanswered_count=score_summary.unanswered_count,
        ambiguous_count=score_summary.ambiguous_count,
        correct_marks_snapshot=test.correct_marks,
        wrong_marks_snapshot=test.wrong_marks,
        e_marks_snapshot=test.e_marks,
        unanswered_marks_snapshot=test.unanswered_marks,
        test_name_snapshot=test.name,
        is_finalized=0,
    )
    db.add(evaluation)
    db.flush()

    # Save per-question answers
    for qs in score_summary.questions:
        ratios = result.fill_ratios.get(qs.question_number, [])
        ratios_str = ",".join(f"{r:.4f}" for r in ratios)
        ea = EvaluationAnswer(
            evaluation_id=evaluation.id,
            question_number=qs.question_number,
            detected_answer=qs.detected_answer,
            correct_answer=qs.correct_answer,
            final_answer=qs.detected_answer,
            result_type=qs.result_type,
            marks=qs.marks,
            confidence=qs.confidence,
            detection_method="AUTO",
            fill_ratios=ratios_str,
        )
        db.add(ea)

    db.commit()
    db.refresh(evaluation)

    # Return result
    return {
        "evaluation_id": evaluation.id,
        "success": True,
        "steps": [{"name": s.name, "status": s.status, "message": s.message} for s in result.steps],
        "warnings": result.warnings,
        "summary": {
            "total_questions": test.total_questions,
            "correct": score_summary.correct_count,
            "wrong": score_summary.wrong_count,
            "e": score_summary.e_count,
            "unanswered": score_summary.unanswered_count,
            "ambiguous": score_summary.ambiguous_count,
            "score": round(score_summary.total_marks, 2),
        },
        "ambiguous_questions": result.ambiguous_questions,
        "bubble_crops": result.bubble_crops,
        "debug_image": result.debug_image_b64,
    }


@router.post("/evaluations/{evaluation_id}/correct")
def apply_manual_corrections(
    evaluation_id: int,
    request: ManualCorrectionRequest,
    db: Session = Depends(get_db),
):
    """
    Apply manual corrections to detected answers before finalizing.
    """
    ev = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    if ev.is_finalized:
        raise HTTPException(status_code=422, detail="Evaluation is already finalized")

    # Apply each correction
    for correction in request.corrections:
        ans = db.query(EvaluationAnswer).filter(
            EvaluationAnswer.evaluation_id == evaluation_id,
            EvaluationAnswer.question_number == correction.question_number,
        ).first()
        if ans:
            ans.final_answer = correction.answer.upper()
            ans.detection_method = "MANUAL"

    db.commit()
    return {"success": True, "corrected": len(request.corrections)}


@router.post("/evaluations/{evaluation_id}/finalize")
def finalize_evaluation(
    evaluation_id: int,
    request: Optional[FinalizeRequest] = None,
    db: Session = Depends(get_db),
):
    """
    Apply final corrections (if any) and compute the final score.
    Marks the evaluation as finalized.
    """
    ev = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    # Apply corrections from this request
    if request and request.corrections:
        for correction in request.corrections:
            ans = db.query(EvaluationAnswer).filter(
                EvaluationAnswer.evaluation_id == evaluation_id,
                EvaluationAnswer.question_number == correction.question_number,
            ).first()
            if ans:
                ans.final_answer = correction.answer.upper()
                ans.detection_method = "MANUAL"

    # Move evaluation to permanent directory
    test = db.query(Test).filter(Test.id == ev.test_id).first()
    eval_dir_final = settings.EVALUATIONS_DIR / str(evaluation_id)
    eval_dir_final.mkdir(parents=True, exist_ok=True)

    if ev.source_file and os.path.exists(ev.source_file):
        ext = os.path.splitext(ev.source_file)[1]
        new_orig = eval_dir_final / f"original{ext}"
        shutil.copy(ev.source_file, str(new_orig))
        ev.source_file = str(new_orig)

    if ev.processed_file and os.path.exists(ev.processed_file):
        new_proc = eval_dir_final / "processed.jpg"
        shutil.copy(ev.processed_file, str(new_proc))
        ev.processed_file = str(new_proc)

    # Recalculate score from final answers
    answers = db.query(EvaluationAnswer)\
        .filter(EvaluationAnswer.evaluation_id == evaluation_id)\
        .order_by(EvaluationAnswer.question_number).all()

    answer_key_dict = {a.question_number: a.correct_answer for a in answers}
    final_answers_dict = {a.question_number: a.final_answer for a in answers}
    confidences_dict = {a.question_number: a.confidence or 0.0 for a in answers}
    methods_dict = {a.question_number: a.detection_method for a in answers}

    from app.services.scoring.calculator import (
        calculate_score, determine_result_type, calculate_marks
    )

    correct = wrong = e_count = unanswered = ambiguous = 0
    total_marks = 0.0

    for ans in answers:
        result_type = determine_result_type(ans.final_answer, ans.correct_answer)
        marks = calculate_marks(
            result_type,
            ev.correct_marks_snapshot,
            ev.wrong_marks_snapshot,
            ev.e_marks_snapshot,
            ev.unanswered_marks_snapshot,
        )
        ans.result_type = result_type
        ans.marks = marks

        if result_type == "CORRECT":
            correct += 1
        elif result_type == "WRONG":
            wrong += 1
        elif result_type == "E":
            e_count += 1
        elif result_type == "UNANSWERED":
            unanswered += 1
        elif result_type == "AMBIGUOUS":
            ambiguous += 1

        total_marks += marks

    ev.correct_count = correct
    ev.wrong_count = wrong
    ev.e_count = e_count
    ev.unanswered_count = unanswered
    ev.ambiguous_count = ambiguous
    ev.total_marks = total_marks
    ev.is_finalized = 1

    db.commit()
    db.refresh(ev)

    return {
        "success": True,
        "evaluation_id": evaluation_id,
        "total_marks": ev.total_marks,
        "correct": ev.correct_count,
        "wrong": ev.wrong_count,
        "e": ev.e_count,
        "unanswered": ev.unanswered_count,
        "ambiguous": ev.ambiguous_count,
    }


@router.get("/evaluations/{evaluation_id}/image/original")
def get_original_image(evaluation_id: int, db: Session = Depends(get_db)):
    ev = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not ev or not ev.source_file or not os.path.exists(ev.source_file):
        raise HTTPException(status_code=404, detail="Original image not found")
    return FileResponse(
        ev.source_file,
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
    )


@router.get("/evaluations/{evaluation_id}/image/processed")
def get_processed_image(evaluation_id: int, db: Session = Depends(get_db)):
    ev = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not ev or not ev.processed_file or not os.path.exists(ev.processed_file):
        raise HTTPException(status_code=404, detail="Processed image not found")
    return FileResponse(
        ev.processed_file,
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
    )
