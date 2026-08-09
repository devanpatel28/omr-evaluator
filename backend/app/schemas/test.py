from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, validator


# ─── Answer Key ────────────────────────────────────────────────────────────────

class AnswerKeyItem(BaseModel):
    question: int = Field(..., ge=1, le=200)
    answer: str = Field(..., min_length=1, max_length=1)

    @validator("answer")
    def answer_must_be_valid(cls, v):
        if v.upper() not in ("A", "B", "C", "D"):
            raise ValueError(f"Answer must be A, B, C, or D (got '{v}')")
        return v.upper()


class AnswerKeyResponse(BaseModel):
    question_number: int
    correct_answer: str

    class Config:
        from_attributes = True


# ─── Test ──────────────────────────────────────────────────────────────────────

class TestCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    total_questions: int = Field(..., ge=1, le=200)
    correct_marks: float = Field(default=1.0)
    wrong_marks: float = Field(default=-1.25)
    e_marks: float = Field(default=-1.0)
    unanswered_marks: float = Field(default=0.0)


class TestUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    total_questions: Optional[int] = Field(None, ge=1, le=200)
    correct_marks: Optional[float] = None
    wrong_marks: Optional[float] = None
    e_marks: Optional[float] = None
    unanswered_marks: Optional[float] = None


class TestResponse(BaseModel):
    id: int
    name: str
    total_questions: int
    correct_marks: float
    wrong_marks: float
    e_marks: float
    unanswered_marks: float
    created_at: datetime
    updated_at: Optional[datetime] = None
    evaluation_count: int = 0
    answer_key_count: int = 0

    class Config:
        from_attributes = True
