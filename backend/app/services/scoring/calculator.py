"""
Scoring calculator — completely decoupled from image processing.
Only operates on detected/final answers vs. correct answers.
"""
from typing import Optional
from dataclasses import dataclass, field
from app.services.scoring.rules import (
    RESULT_CORRECT, RESULT_WRONG, RESULT_E,
    RESULT_UNANSWERED, RESULT_AMBIGUOUS,
    DEFAULT_CORRECT_MARKS, DEFAULT_WRONG_MARKS,
    DEFAULT_E_MARKS, DEFAULT_UNANSWERED_MARKS,
    DETECT_UNANSWERED, DETECT_AMBIGUOUS,
)


@dataclass
class QuestionScore:
    question_number: int
    detected_answer: Optional[str]
    correct_answer: Optional[str]
    final_answer: Optional[str]
    result_type: str
    marks: float
    confidence: float
    detection_method: str


@dataclass
class ScoreSummary:
    total_marks: float = 0.0
    correct_count: int = 0
    wrong_count: int = 0
    e_count: int = 0
    unanswered_count: int = 0
    ambiguous_count: int = 0
    correct_marks_total: float = 0.0
    wrong_penalty_total: float = 0.0
    e_penalty_total: float = 0.0
    questions: list = field(default_factory=list)


def determine_result_type(
    answer: Optional[str],
    correct_answer: Optional[str],
) -> str:
    """
    Determine the result type for a single question.
    
    Args:
        answer: The student's final answer (A/B/C/D/E/UNANSWERED/AMBIGUOUS/None)
        correct_answer: The correct answer from the answer key (A/B/C/D)
    
    Returns:
        One of: CORRECT, WRONG, E, UNANSWERED, AMBIGUOUS
    """
    if answer is None or answer == DETECT_UNANSWERED:
        return RESULT_UNANSWERED

    if answer == DETECT_AMBIGUOUS or answer == "MULTIPLE":
        return RESULT_WRONG

    if answer == "E":
        return RESULT_E

    if answer == correct_answer:
        return RESULT_CORRECT

    return RESULT_WRONG


def calculate_marks(
    result_type: str,
    correct_marks: float = DEFAULT_CORRECT_MARKS,
    wrong_marks: float = DEFAULT_WRONG_MARKS,
    e_marks: float = DEFAULT_E_MARKS,
    unanswered_marks: float = DEFAULT_UNANSWERED_MARKS,
) -> float:
    """
    Calculate marks for a single question based on result type.
    Ambiguous questions return 0 (must be manually resolved).
    """
    mapping = {
        RESULT_CORRECT: correct_marks,
        RESULT_WRONG: wrong_marks,
        RESULT_E: e_marks,
        RESULT_UNANSWERED: unanswered_marks,
        RESULT_AMBIGUOUS: 0.0,  # Not counted until manually resolved
    }
    return mapping.get(result_type, 0.0)


def calculate_score(
    detected_answers: dict,  # {question_number: detected_answer}
    answer_key: dict,        # {question_number: correct_answer}
    confidences: dict,       # {question_number: confidence}
    detection_methods: dict, # {question_number: "AUTO" | "MANUAL"}
    correct_marks: float = DEFAULT_CORRECT_MARKS,
    wrong_marks: float = DEFAULT_WRONG_MARKS,
    e_marks: float = DEFAULT_E_MARKS,
    unanswered_marks: float = DEFAULT_UNANSWERED_MARKS,
) -> ScoreSummary:
    """
    Calculate the full score for an evaluation.
    
    Returns a ScoreSummary with totals and per-question breakdown.
    """
    summary = ScoreSummary()

    all_questions = sorted(set(list(detected_answers.keys()) + list(answer_key.keys())))

    for qnum in all_questions:
        answer = detected_answers.get(qnum)
        correct = answer_key.get(qnum)
        confidence = confidences.get(qnum, 0.0)
        method = detection_methods.get(qnum, "AUTO")

        result_type = determine_result_type(answer, correct)
        marks = calculate_marks(result_type, correct_marks, wrong_marks, e_marks, unanswered_marks)

        # Update counters
        if result_type == RESULT_CORRECT:
            summary.correct_count += 1
            summary.correct_marks_total += marks
        elif result_type == RESULT_WRONG:
            summary.wrong_count += 1
            summary.wrong_penalty_total += marks
        elif result_type == RESULT_E:
            summary.e_count += 1
            summary.e_penalty_total += marks
        elif result_type == RESULT_UNANSWERED:
            summary.unanswered_count += 1
        elif result_type == RESULT_AMBIGUOUS:
            summary.ambiguous_count += 1

        summary.total_marks += marks
        summary.questions.append(
            QuestionScore(
                question_number=qnum,
                detected_answer=answer,
                correct_answer=correct,
                final_answer=answer,
                result_type=result_type,
                marks=marks,
                confidence=confidence,
                detection_method=method,
            )
        )

    return summary
