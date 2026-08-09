from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.test import Test, AnswerKey
from app.schemas.test import AnswerKeyResponse
from app.services.files.answer_key_parser import parse_answer_key

router = APIRouter(prefix="/api/tests", tags=["answer-key"])


@router.post("/{test_id}/answer-key")
async def upload_answer_key(
    test_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload and parse an answer key file (JSON or CSV).
    Replaces any existing answer key for this test.
    """
    # Verify test exists
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail=f"Test {test_id} not found")

    # Read file content
    content_bytes = await file.read()
    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content = content_bytes.decode("latin-1")

    # Parse answer key
    parse_result = parse_answer_key(content, file.filename or "upload", test.total_questions)

    if not parse_result.success:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Answer key validation failed",
                "errors": parse_result.errors,
                "warnings": parse_result.warnings,
            }
        )

    # Clear existing answer key
    db.query(AnswerKey).filter(AnswerKey.test_id == test_id).delete()

    # Insert new answer key
    for parsed in parse_result.answers:
        key = AnswerKey(
            test_id=test_id,
            question_number=parsed.question,
            correct_answer=parsed.answer,
        )
        db.add(key)

    db.commit()

    return {
        "success": True,
        "count": len(parse_result.answers),
        "warnings": parse_result.warnings,
        "message": f"Successfully imported {len(parse_result.answers)} answers",
    }


@router.post("/{test_id}/answer-key/validate")
async def validate_answer_key(
    test_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Validate an answer key file without saving it.
    """
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail=f"Test {test_id} not found")

    content_bytes = await file.read()
    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content = content_bytes.decode("latin-1")

    parse_result = parse_answer_key(content, file.filename or "upload", test.total_questions)

    return {
        "valid": parse_result.success,
        "count": len(parse_result.answers),
        "errors": parse_result.errors,
        "warnings": parse_result.warnings,
    }
