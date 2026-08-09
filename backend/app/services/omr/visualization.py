"""
Visualization — overlays detected answers and bubble regions on the processed image.
Used for debugging, review UI, and result verification.
"""
import cv2
import numpy as np
import base64
from typing import Dict, Optional, List, Tuple
from app.services.omr.template import OMRTemplate


# Color palette (BGR)
COLOR_CORRECT = (0, 200, 0)       # Green
COLOR_WRONG = (0, 0, 220)         # Red
COLOR_E = (0, 165, 255)           # Orange
COLOR_UNANSWERED = (128, 128, 128)# Gray
COLOR_AMBIGUOUS = (0, 220, 220)   # Yellow-ish
COLOR_DETECTED = (220, 50, 50)    # Blue-ish
COLOR_TEXT = (0, 0, 0)            # Black


def draw_detected_answers(
    warped_img: np.ndarray,
    template: OMRTemplate,
    detection_results: Dict[int, dict],  # {q_num: {"answer": str, "fill_ratios": list}}
    answer_key: Optional[Dict[int, str]] = None,  # {q_num: correct_answer}
    total_questions: int = 200,
    row_alignments: Optional[Dict[float, Tuple[float, float, float, float]]] = None,
) -> np.ndarray:
    """
    Draw circles and labels on the warped image showing detected answers.
    
    - Green circle: correct detection (if answer_key provided and correct)
    - Red circle: wrong
    - Orange circle: E option
    - Gray: unanswered
    - Yellow: ambiguous
    - Blue outline: all bubble positions
    """
    vis = warped_img.copy()
    if len(vis.shape) == 2:
        vis = cv2.cvtColor(vis, cv2.COLOR_GRAY2BGR)

    from app.services.omr.bubble_detection import align_question_bubbles
    options = template.options  # ["A","B","C","D","E"]

    from app.core.config import settings
    threshold = settings.OMR_FILL_THRESHOLD

    for q_num in range(1, total_questions + 1):
        detected = detection_results.get(q_num, {}).get("answer", "UNANSWERED")
        fill_ratios = detection_results.get(q_num, {}).get("fill_ratios", [0.0]*5)
        
        bubbles = template.get_all_bubbles_for_question(q_num)
        aligned_bubbles = align_question_bubbles(warped_img, bubbles, row_alignments)

        # Identify which bubbles are actually ticked
        ticked_indices = [i for i, r in enumerate(fill_ratios) if r >= threshold]

        if len(ticked_indices) == 0 or detected == "UNANSWERED":
            # Unanswered: Draw horizontal blue line through all bubbles
            if aligned_bubbles:
                start_pt = (int(aligned_bubbles[0].x - aligned_bubbles[0].radius), int(aligned_bubbles[0].y))
                end_pt = (int(aligned_bubbles[-1].x + aligned_bubbles[-1].radius), int(aligned_bubbles[-1].y))
                cv2.line(vis, start_pt, end_pt, (255, 0, 0), 2)
            
            # Still draw empty outlines
            for aligned_bubble in aligned_bubbles:
                cx, cy, r = int(aligned_bubble.x), int(aligned_bubble.y), int(aligned_bubble.radius)
                cv2.circle(vis, (cx, cy), r, (180, 180, 180), 1)
        
        elif len(ticked_indices) > 1 or detected == "MULTIPLE":
            # Multiple: Draw blue line border (circle) around all ticked options
            for i, aligned_bubble in enumerate(aligned_bubbles):
                cx, cy, r = int(aligned_bubble.x), int(aligned_bubble.y), int(aligned_bubble.radius)
                if i in ticked_indices:
                    cv2.circle(vis, (cx, cy), r + 2, (255, 0, 0), 2)  # Blue border
                else:
                    cv2.circle(vis, (cx, cy), r, (180, 180, 180), 1)

        else:
            # Single answer: determine color
            if answer_key:
                correct = answer_key.get(q_num)
                if detected == correct:
                    color = COLOR_CORRECT
                elif detected == "E":
                    color = COLOR_E
                else:
                    color = COLOR_WRONG
            else:
                color = COLOR_DETECTED
            
            for i, aligned_bubble in enumerate(aligned_bubbles):
                cx, cy, r = int(aligned_bubble.x), int(aligned_bubble.y), int(aligned_bubble.radius)
                if i in ticked_indices:
                    cv2.circle(vis, (cx, cy), r + 2, color, 2)  # Colored border only, no fill
                else:
                    cv2.circle(vis, (cx, cy), r, (180, 180, 180), 1)

    return vis


def draw_sheet_boundary(
    img: np.ndarray,
    corners: np.ndarray,
    color: tuple = (0, 255, 0),
    thickness: int = 3,
) -> np.ndarray:
    """Draw the detected sheet boundary on the original image."""
    vis = img.copy()
    pts = corners.astype(np.int32).reshape((-1, 1, 2))
    cv2.polylines(vis, [pts], isClosed=True, color=color, thickness=thickness)
    for pt in corners:
        cv2.circle(vis, (int(pt[0]), int(pt[1])), 8, (0, 0, 255), -1)
    return vis


def image_to_base64(img: np.ndarray, format: str = ".jpg") -> str:
    """Convert OpenCV image to base64 string for API responses."""
    _, buffer = cv2.imencode(format, img)
    return base64.b64encode(buffer).decode("utf-8")


def crop_question_row(
    warped_gray: np.ndarray,
    template: OMRTemplate,
    question_number: int,
    row_alignments: Optional[Dict[float, Tuple[float, float]]] = None,
) -> Optional[str]:
    """
    Return a base64-encoded JPEG crop of the bubble row for a question.
    Used in the review UI.
    """
    bubbles = template.get_all_bubbles_for_question(question_number)
    if not bubbles:
        return None

    xs = []
    ys = []
    for b in bubbles:
        warped_x = b.x + 50
        warped_y = b.y + 50
        if row_alignments and b.y in row_alignments:
            left_x, left_y, right_x, right_y = row_alignments[b.y]
            progress = (warped_x - 20) / (1065 - 20)
            warped_y = left_y + progress * (right_y - left_y)
        xs.append(warped_x)
        ys.append(warped_y)

    r = bubbles[0].radius
    padding = r * 3
    
    x1 = max(0, int(min(xs) - padding))
    y1 = max(0, int(min(ys) - padding))
    x2 = min(warped_gray.shape[1], int(max(xs) + padding))
    y2 = min(warped_gray.shape[0], int(max(ys) + padding))

    crop = warped_gray[y1:y2, x1:x2]

    # Scale up for visibility
    scale = 3
    h, w = crop.shape[:2]
    crop_big = cv2.resize(crop, (w * scale, h * scale), interpolation=cv2.INTER_LINEAR)

    return image_to_base64(crop_big, ".jpg")
