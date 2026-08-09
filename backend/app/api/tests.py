from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.test import Test, AnswerKey
from app.models.evaluation import Evaluation
from app.schemas.test import TestCreate, TestUpdate, TestResponse, AnswerKeyResponse

router = APIRouter(prefix="/api/tests", tags=["tests"])


def get_test_or_404(test_id: int, db: Session) -> Test:
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail=f"Test {test_id} not found")
    return test


@router.get("", response_model=List[TestResponse])
def list_tests(db: Session = Depends(get_db)):
    tests = db.query(Test).order_by(Test.created_at.desc()).all()
    result = []
    for t in tests:
        evaluation_count = db.query(Evaluation).filter(Evaluation.test_id == t.id).count()
        answer_key_count = db.query(AnswerKey).filter(AnswerKey.test_id == t.id).count()
        resp = TestResponse.model_validate(t)
        resp.evaluation_count = evaluation_count
        resp.answer_key_count = answer_key_count
        result.append(resp)
    return result


@router.post("", response_model=TestResponse, status_code=status.HTTP_201_CREATED)
def create_test(data: TestCreate, db: Session = Depends(get_db)):
    test = Test(**data.model_dump())
    db.add(test)
    db.commit()
    db.refresh(test)
    resp = TestResponse.model_validate(test)
    resp.evaluation_count = 0
    resp.answer_key_count = 0
    return resp


@router.get("/{test_id}", response_model=TestResponse)
def get_test(test_id: int, db: Session = Depends(get_db)):
    test = get_test_or_404(test_id, db)
    evaluation_count = db.query(Evaluation).filter(Evaluation.test_id == test_id).count()
    answer_key_count = db.query(AnswerKey).filter(AnswerKey.test_id == test_id).count()
    resp = TestResponse.model_validate(test)
    resp.evaluation_count = evaluation_count
    resp.answer_key_count = answer_key_count
    return resp


@router.put("/{test_id}", response_model=TestResponse)
def update_test(test_id: int, data: TestUpdate, db: Session = Depends(get_db)):
    test = get_test_or_404(test_id, db)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(test, key, value)
    db.commit()
    db.refresh(test)
    resp = TestResponse.model_validate(test)
    return resp


@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test(test_id: int, db: Session = Depends(get_db)):
    test = get_test_or_404(test_id, db)
    db.delete(test)
    db.commit()


@router.get("/{test_id}/answer-key", response_model=List[AnswerKeyResponse])
def get_answer_key(test_id: int, db: Session = Depends(get_db)):
    get_test_or_404(test_id, db)
    keys = db.query(AnswerKey).filter(AnswerKey.test_id == test_id)\
        .order_by(AnswerKey.question_number).all()
    return keys
