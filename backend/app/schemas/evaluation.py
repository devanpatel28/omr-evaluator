from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class EvaluationAnswerResponse(BaseModel):
    id: int
    question_number: int
    detected_answer: Optional[str] = None
    correct_answer: Optional[str] = None
    final_answer: Optional[str] = None
    result_type: Optional[str] = None
    marks: Optional[float] = None
    confidence: Optional[float] = None
    detection_method: str = "AUTO"
    fill_ratios: Optional[str] = None

    class Config:
        from_attributes = True


class EvaluationResponse(BaseModel):
    id: int
    test_id: int
    source_file: Optional[str] = None
    processed_file: Optional[str] = None
    total_marks: float
    correct_count: int
    wrong_count: int
    e_count: int
    unanswered_count: int
    ambiguous_count: int
    correct_marks_snapshot: float
    wrong_marks_snapshot: float
    e_marks_snapshot: float
    unanswered_marks_snapshot: float
    test_name_snapshot: Optional[str] = None
    is_finalized: int
    created_at: datetime
    answers: List[EvaluationAnswerResponse] = []

    class Config:
        from_attributes = True


class EvaluationSummaryResponse(BaseModel):
    id: int
    test_id: int
    total_marks: float
    correct_count: int
    wrong_count: int
    e_count: int
    unanswered_count: int
    ambiguous_count: int
    is_finalized: int
    created_at: datetime

    class Config:
        from_attributes = True


class ManualCorrectionItem(BaseModel):
    question_number: int = Field(..., ge=1, le=200)
    answer: str = Field(...)  # A/B/C/D/E/UNANSWERED

    @property
    def answer_upper(self) -> str:
        return self.answer.upper()


class ManualCorrectionRequest(BaseModel):
    corrections: List[ManualCorrectionItem]


class FinalizeRequest(BaseModel):
    corrections: Optional[List[ManualCorrectionItem]] = None
