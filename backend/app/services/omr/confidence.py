"""
Confidence scoring — computes a 0.0-1.0 confidence value for each detected answer.
Based entirely on measurable image-processing values, never random.
"""
from typing import List, Optional


def calculate_confidence(
    fill_ratios: List[float],
    detected_answer: Optional[str],
    fill_threshold: float = 0.35,
    ambiguity_margin: float = 0.10,
) -> float:
    """
    Calculate confidence score for a detected answer.
    
    Factors:
    1. How far above the fill threshold is the best bubble?
    2. How large is the gap between best and second-best bubble?
    3. Is the best bubble clearly dominant?
    
    Returns:
        confidence: 0.0 (no confidence) to 1.0 (maximum confidence)
    """
    if not fill_ratios or len(fill_ratios) == 0:
        return 0.0

    if detected_answer in ("UNANSWERED", "AMBIGUOUS", None):
        if detected_answer == "UNANSWERED":
            # High confidence if all bubbles are clearly empty
            max_fill = max(fill_ratios) if fill_ratios else 0
            empty_confidence = 1.0 - (max_fill / fill_threshold) if fill_threshold > 0 else 0.0
            return max(0.0, min(1.0, empty_confidence))
        return 0.0  # AMBIGUOUS = 0 confidence

    sorted_ratios = sorted(fill_ratios, reverse=True)
    best = sorted_ratios[0]
    second = sorted_ratios[1] if len(sorted_ratios) > 1 else 0.0

    # Factor 1: how much above threshold is the best fill?
    # Scores 0.0 at threshold, 1.0 at 100%+ fill
    above_threshold = (best - fill_threshold) / (1.0 - fill_threshold) if fill_threshold < 1.0 else 0.0
    above_threshold = max(0.0, min(1.0, above_threshold))

    # Factor 2: gap from second-best
    # Scales from 0 at ambiguity_margin to 1.0 at full separation
    gap = best - second
    gap_score = (gap - ambiguity_margin) / (1.0 - ambiguity_margin) if ambiguity_margin < 1.0 else 0.0
    gap_score = max(0.0, min(1.0, gap_score))

    # Factor 3: absolute fill of the best bubble (penalize very weak fills)
    fill_score = min(1.0, best / 0.7)  # 0.7 = "fully filled" target

    # Weighted combination
    confidence = (
        0.40 * above_threshold +
        0.40 * gap_score +
        0.20 * fill_score
    )

    return round(max(0.0, min(1.0, confidence)), 4)


def calculate_all_confidences(
    detection_results: dict,  # {q_num: {"answer": str, "fill_ratios": list}}
    fill_threshold: float = 0.35,
    ambiguity_margin: float = 0.10,
) -> dict:
    """
    Calculate confidence for all questions.
    
    Returns:
        {question_number: confidence_float}
    """
    confidences = {}
    for qnum, data in detection_results.items():
        answer = data.get("answer")
        ratios = data.get("fill_ratios", [])
        confidences[qnum] = calculate_confidence(ratios, answer, fill_threshold, ambiguity_margin)
    return confidences
