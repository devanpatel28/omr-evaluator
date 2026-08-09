from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id", ondelete="CASCADE"), nullable=False)
    source_file = Column(String(500), nullable=True)       # Path to original uploaded image
    processed_file = Column(String(500), nullable=True)    # Path to debug/visualization image
    total_marks = Column(Float, nullable=False, default=0.0)
    correct_count = Column(Integer, nullable=False, default=0)
    wrong_count = Column(Integer, nullable=False, default=0)
    e_count = Column(Integer, nullable=False, default=0)
    unanswered_count = Column(Integer, nullable=False, default=0)
    ambiguous_count = Column(Integer, nullable=False, default=0)
    # Snapshot of scoring rules at time of evaluation (for reproducibility)
    correct_marks_snapshot = Column(Float, nullable=False, default=1.0)
    wrong_marks_snapshot = Column(Float, nullable=False, default=-1.25)
    e_marks_snapshot = Column(Float, nullable=False, default=-1.0)
    unanswered_marks_snapshot = Column(Float, nullable=False, default=0.0)
    test_name_snapshot = Column(String(255), nullable=True)
    is_finalized = Column(Integer, nullable=False, default=0)  # 0=draft, 1=finalized
    created_at = Column(DateTime, default=datetime.utcnow)

    test = relationship("Test", back_populates="evaluations")
    answers = relationship("EvaluationAnswer", back_populates="evaluation", cascade="all, delete-orphan",
                           order_by="EvaluationAnswer.question_number")


class EvaluationAnswer(Base):
    __tablename__ = "evaluation_answers"

    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id", ondelete="CASCADE"), nullable=False)
    question_number = Column(Integer, nullable=False)
    detected_answer = Column(String(20), nullable=True)    # A/B/C/D/E/UNANSWERED/AMBIGUOUS
    correct_answer = Column(String(1), nullable=True)
    final_answer = Column(String(20), nullable=True)       # After manual correction
    result_type = Column(String(20), nullable=True)        # CORRECT/WRONG/E/UNANSWERED/AMBIGUOUS
    marks = Column(Float, nullable=True, default=0.0)
    confidence = Column(Float, nullable=True, default=0.0) # 0.0 - 1.0
    detection_method = Column(String(20), nullable=False, default="AUTO")  # AUTO/MANUAL

    # Fill ratios for all 5 bubbles (stored as comma-separated: "a_fill,b_fill,c_fill,d_fill,e_fill")
    fill_ratios = Column(String(100), nullable=True)

    evaluation = relationship("Evaluation", back_populates="answers")
