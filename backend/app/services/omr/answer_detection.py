"""
Answer detection — determines the selected option for each question
based on bubble fill ratios. Completely rule-based, no ML or hardcoding.
"""
from typing import List, Optional, Tuple
from app.core.config import settings


ANSWER_OPTIONS = ["A", "B", "C", "D", "E"]


def detect_answer_from_ratios(
    fill_ratios: List[float],
    fill_threshold: float = None,
    ambiguity_margin: float = None,
    min_fill: float = None,
) -> Tuple[Optional[str], str]:
    """
    Determine the student's answer from bubble fill ratios.
    
    Rules:
    1. If no bubble exceeds fill_threshold → UNANSWERED
    2. If exactly one bubble clearly exceeds threshold AND
       the gap from second-best ≥ ambiguity_margin → clear answer
    3. If multiple bubbles are filled OR gap is too small → AMBIGUOUS
    
    Args:
        fill_ratios: [A, B, C, D, E] fill ratios (0.0-1.0)
        fill_threshold: Minimum fill ratio to consider a bubble marked
        ambiguity_margin: Min gap between top-2 to call it unambiguous
        min_fill: Absolute minimum fill to be considered at all
    
    Returns:
        (detected_answer, detection_notes)
        detected_answer: 'A'-'E' | 'UNANSWERED' | 'AMBIGUOUS'
    """
    if fill_threshold is None:
        fill_threshold = settings.OMR_FILL_THRESHOLD
    if ambiguity_margin is None:
        ambiguity_margin = settings.OMR_AMBIGUITY_MARGIN
    if min_fill is None:
        min_fill = settings.OMR_MIN_BUBBLE_FILL

    if len(fill_ratios) != 5:
        # Pad or trim to 5
        fill_ratios = (fill_ratios + [0.0] * 5)[:5]

    # Build sorted list: (fill_ratio, option_index)
    indexed = sorted(enumerate(fill_ratios), key=lambda x: x[1], reverse=True)

    best_idx, best_fill = indexed[0]
    second_idx, second_fill = indexed[1] if len(indexed) > 1 else (None, 0.0)

    notes = (
        f"A={fill_ratios[0]:.3f} B={fill_ratios[1]:.3f} "
        f"C={fill_ratios[2]:.3f} D={fill_ratios[3]:.3f} E={fill_ratios[4]:.3f}"
    )

    # Case 1: No bubble exceeds threshold
    if best_fill < fill_threshold:
        return "UNANSWERED", notes

    # Case 2: Multiple bubbles above threshold → MULTIPLE (treated as wrong)
    above_threshold = [i for i, r in enumerate(fill_ratios) if r >= fill_threshold]
    if len(above_threshold) > 1:
        return "MULTIPLE", notes

    # Case 3: Exactly one above threshold — check if gap is sufficient
    gap = best_fill - second_fill
    if gap < ambiguity_margin:
        return "MULTIPLE", notes

    # Clear detection
    return ANSWER_OPTIONS[best_idx], notes


def detect_answers_for_all_questions(
    all_fill_ratios: dict,  # {question_number: [A,B,C,D,E] ratios}
    fill_threshold: float = None,
    ambiguity_margin: float = None,
) -> dict:
    """
    Run answer detection for all questions.
    
    Returns:
        {question_number: {"answer": str, "fill_ratios": List[float], "notes": str}}
    """
    results = {}
    for qnum, ratios in all_fill_ratios.items():
        answer, notes = detect_answer_from_ratios(ratios, fill_threshold, ambiguity_margin)
        results[qnum] = {
            "answer": answer,
            "fill_ratios": ratios,
            "notes": notes,
        }
    return results
