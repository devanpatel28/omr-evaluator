from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class Test(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    total_questions = Column(Integer, nullable=False, default=200)
    correct_marks = Column(Float, nullable=False, default=1.0)
    wrong_marks = Column(Float, nullable=False, default=-1.25)
    e_marks = Column(Float, nullable=False, default=-1.0)
    unanswered_marks = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    answer_keys = relationship("AnswerKey", back_populates="test", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="test", cascade="all, delete-orphan")


class AnswerKey(Base):
    __tablename__ = "answer_keys"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id", ondelete="CASCADE"), nullable=False)
    question_number = Column(Integer, nullable=False)
    correct_answer = Column(String(1), nullable=False)

    test = relationship("Test", back_populates="answer_keys")
