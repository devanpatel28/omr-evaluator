"""
OMR Processing Pipeline — orchestrates the full OMR processing workflow.

Pipeline:
  Upload Image
    → Validate Image
    → Image Preprocessing
    → Detect OMR Sheet
    → Perspective Correction
    → Crop / Normalize Sheet
    → Detect Question Grid (via template)
    → Detect Option Bubbles
    → Calculate Bubble Fill Ratio
    → Determine Selected Option
    → Confidence Evaluation
    → Compare With Answer Key
    → Calculate Marks
    → Save Evaluation
    → Display Results
"""
import os
# pyrefly: ignore [missing-import]
import cv2
import numpy as np
from pathlib import Path
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass, field

from app.core.config import settings
from app.services.omr.preprocessing import (
    load_image, load_image_from_bytes, preprocess_for_detection,
    preprocess_for_bubbles, check_image_quality, to_grayscale
)
from app.services.omr.sheet_detection import detect_sheet
from app.services.omr.perspective import perspective_transform, auto_rotate_upright
from app.services.omr.template import OMRTemplate, ensure_default_template
from app.services.omr.bubble_detection import get_fill_ratios_for_question
from app.services.omr.answer_detection import detect_answer_from_ratios
from app.services.omr.confidence import calculate_confidence
from app.services.omr.visualization import draw_detected_answers, image_to_base64, crop_question_row


@dataclass
class ProcessingStep:
    name: str
    status: str = "pending"   # pending | done | error
    message: str = ""


@dataclass
class OMRProcessingResult:
    success: bool
    steps: List[ProcessingStep] = field(default_factory=list)
    error: Optional[str] = None
    warnings: List[str] = field(default_factory=list)

    # Detection results: {q_num: detected_answer}
    detected_answers: Dict[int, str] = field(default_factory=dict)
    fill_ratios: Dict[int, List[float]] = field(default_factory=dict)
    confidences: Dict[int, float] = field(default_factory=dict)
    ambiguous_questions: List[int] = field(default_factory=list)

    # Image paths
    original_path: Optional[str] = None
    processed_path: Optional[str] = None

    # Base64 debug image
    debug_image_b64: Optional[str] = None

    # Bubble crops for review: {q_num: base64_string}
    bubble_crops: Dict[int, str] = field(default_factory=dict)


def process_omr_image(
    image_path: str,
    template: OMRTemplate,
    total_questions: int,
    answer_key: Optional[Dict[int, str]] = None,
    output_dir: Optional[str] = None,
    generate_debug_image: bool = True,
    generate_bubble_crops: bool = True,
) -> OMRProcessingResult:
    """
    Full OMR processing pipeline.
    
    Args:
        image_path: Path to the uploaded OMR image
        template: OMR sheet template
        total_questions: Number of questions to process
        answer_key: Optional {q_num: answer} for debug visualization
        output_dir: Where to save processed image
        generate_debug_image: Whether to generate the overlay debug image
        generate_bubble_crops: Whether to extract crops for review UI
    
    Returns:
        OMRProcessingResult with all detection data
    """
    result = OMRProcessingResult(success=False, original_path=image_path)
    steps = result.steps

    # ── Step 1: Load Image ──────────────────────────────────────────────────
    step = ProcessingStep("Image loaded")
    steps.append(step)
    try:
        from app.services.omr.preprocessing import adjust_contrast_brightness
        img = load_image(image_path)
        img = adjust_contrast_brightness(img)
        step.status = "done"
        step.message = f"{img.shape[1]}×{img.shape[0]} px"
    except Exception as e:
        step.status = "error"
        step.message = str(e)
        result.error = f"Failed to load image: {e}"
        return result

    # ── Step 2: Quality Check ───────────────────────────────────────────────
    step = ProcessingStep("Image quality check")
    steps.append(step)
    quality = check_image_quality(img)
    result.warnings.extend(quality["warnings"])
    if not quality["is_ok"]:
        step.status = "error"
        step.message = " | ".join(quality["errors"])
        result.error = step.message
        return result
    step.status = "done"
    if quality["warnings"]:
        step.message = f"Warnings: {'; '.join(quality['warnings'])}"

    # ── Step 3: Preprocessing ───────────────────────────────────────────────
    step = ProcessingStep("Image preprocessing")
    steps.append(step)
    try:
        gray, binary = preprocess_for_detection(img)
        step.status = "done"
    except Exception as e:
        step.status = "error"
        step.message = str(e)
        result.error = f"Preprocessing failed: {e}"
        return result

    # ── Step 4: Sheet Detection ─────────────────────────────────────────────
    step = ProcessingStep("OMR sheet detected")
    steps.append(step)
    corners = detect_sheet(img)
    step.status = "done"
    step.message = "Sheet boundary detected"

    # ── Step 5: Perspective Correction ──────────────────────────────────────
    step = ProcessingStep("Perspective corrected")
    steps.append(step)
    try:
        warped = perspective_transform(
            img, corners,
            target_width=template.page_width + 100,
            target_height=template.page_height + 100,
        )
        warped = auto_rotate_upright(warped)
        warped_gray = to_grayscale(warped)
        step.status = "done"
    except Exception as e:
        step.status = "error"
        step.message = str(e)
        result.error = f"Perspective correction failed: {e}"
        return result

    # ── Step 6: Bubble Fill Detection ───────────────────────────────────────
    step = ProcessingStep("Question grid detected")
    steps.append(step)

    all_fill_ratios = {}
    try:
        from app.services.omr.timing_marks import detect_row_alignments
        row_alignments = detect_row_alignments(warped_gray, template)
        
        for q_num in range(1, total_questions + 1):
            ratios = get_fill_ratios_for_question(warped_gray, template, q_num, row_alignments)
            all_fill_ratios[q_num] = ratios
        step.status = "done"
        step.message = f"{total_questions} question positions mapped"
    except Exception as e:
        step.status = "error"
        step.message = str(e)
        result.error = f"Bubble detection failed: {e}"
        return result

    # ── Step 7: Answer Recognition ──────────────────────────────────────────
    step = ProcessingStep("Answers recognized")
    steps.append(step)

    detected_answers = {}
    confidences = {}
    ambiguous = []

    for q_num in range(1, total_questions + 1):
        ratios = all_fill_ratios.get(q_num, [0.0] * 5)
        answer, notes = detect_answer_from_ratios(ratios)
        confidence = calculate_confidence(
            ratios, answer,
            settings.OMR_FILL_THRESHOLD,
            settings.OMR_AMBIGUITY_MARGIN,
        )
        detected_answers[q_num] = answer
        confidences[q_num] = confidence
        if answer == "AMBIGUOUS":
            ambiguous.append(q_num)

    result.detected_answers = detected_answers
    result.fill_ratios = all_fill_ratios
    result.confidences = confidences
    result.ambiguous_questions = ambiguous

    step.status = "done"
    step.message = (
        f"{total_questions} answers detected. "
        f"Ambiguous: {len(ambiguous)}. "
        f"Unanswered: {sum(1 for a in detected_answers.values() if a == 'UNANSWERED')}"
    )

    # ── Step 8: Save Processed Image ────────────────────────────────────────
    if generate_debug_image and output_dir:
        step2 = ProcessingStep("Debug image generated")
        steps.append(step2)
        try:
            vis = draw_detected_answers(warped_gray, template, 
                                        {q: {"answer": a, "fill_ratios": all_fill_ratios.get(q, [])}
                                         for q, a in detected_answers.items()},
                                        answer_key=answer_key,
                                        total_questions=total_questions,
                                        row_alignments=row_alignments)
            processed_path = os.path.join(output_dir, "processed.jpg")
            cv2.imwrite(processed_path, vis)
            result.processed_path = processed_path
            result.debug_image_b64 = image_to_base64(vis)
            step2.status = "done"
        except Exception as e:
            step2.status = "error"
            step2.message = str(e)

    # ── Step 9: Bubble Crops for Review ─────────────────────────────────────
    if generate_bubble_crops:
        # Only generate crops for ambiguous/low-confidence questions (optimization)
        low_confidence_threshold = settings.OMR_CONFIDENCE_THRESHOLD
        questions_needing_review = set(ambiguous) | {
            q for q, c in confidences.items() if c < low_confidence_threshold
        }

        for q_num in questions_needing_review:
            crop_b64 = crop_question_row(warped_gray, template, q_num, row_alignments)
            if crop_b64:
                result.bubble_crops[q_num] = crop_b64

    result.success = True
    return result

