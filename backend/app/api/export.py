# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.core.database import get_db
from app.models.evaluation import Evaluation, EvaluationAnswer
from app.models.test import Test
from app.services.files.export_service import export_to_csv, export_to_json, export_to_pdf

router = APIRouter(prefix="/api/evaluations", tags=["export"])


@router.get("/{evaluation_id}/export/csv")
def export_csv(evaluation_id: int, db: Session = Depends(get_db)):
    ev = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    test = db.query(Test).filter(Test.id == ev.test_id).first()
    answers = db.query(EvaluationAnswer)\
        .filter(EvaluationAnswer.evaluation_id == evaluation_id)\
        .order_by(EvaluationAnswer.question_number).all()

    csv_bytes = export_to_csv(answers, ev, test)
    test_name = (ev.test_name_snapshot or "evaluation").replace(" ", "_")
    filename = f"evaluation_{evaluation_id}_{test_name}.csv"

    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{evaluation_id}/export/json")
def export_json(evaluation_id: int, db: Session = Depends(get_db)):
    ev = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    test = db.query(Test).filter(Test.id == ev.test_id).first()
    answers = db.query(EvaluationAnswer)\
        .filter(EvaluationAnswer.evaluation_id == evaluation_id)\
        .order_by(EvaluationAnswer.question_number).all()

    json_bytes = export_to_json(answers, ev, test)
    test_name = (ev.test_name_snapshot or "evaluation").replace(" ", "_")
    filename = f"evaluation_{evaluation_id}_{test_name}.json"

    return StreamingResponse(
        io.BytesIO(json_bytes),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{evaluation_id}/export/pdf")
def export_pdf(evaluation_id: int, db: Session = Depends(get_db)):
    ev = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    test = db.query(Test).filter(Test.id == ev.test_id).first()
    answers = db.query(EvaluationAnswer)\
        .filter(EvaluationAnswer.evaluation_id == evaluation_id)\
        .order_by(EvaluationAnswer.question_number).all()

    try:
        pdf_bytes = export_to_pdf(answers, ev, test)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    test_name = (ev.test_name_snapshot or "evaluation").replace(" ", "_")
    filename = f"evaluation_{evaluation_id}_{test_name}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
