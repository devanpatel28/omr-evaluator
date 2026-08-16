"""
Bubble detection — extracts fill ratio for each bubble region.
Works on the normalized (perspective-corrected) grayscale image.
"""
# pyrefly: ignore [missing-import]
import cv2
# pyrefly: ignore [missing-import]
import numpy as np
from typing import List, Tuple, Optional, Dict
from app.services.omr.template import BubbleCoord, OMRTemplate


def extract_bubble_roi(
    img_gray: np.ndarray,
    bubble: BubbleCoord,
    padding: int = 2,
) -> Optional[np.ndarray]:
    """
    Extract a square region of interest around a bubble center.
    
    Args:
        img_gray: Grayscale normalized sheet image
        bubble: Bubble coordinate (center + radius)
        padding: Extra pixels beyond the bubble radius
    
    Returns:
        Cropped grayscale ROI, or None if out of bounds
    """
    r = int(bubble.radius) + padding
    x1 = int(bubble.x) - r
    y1 = int(bubble.y) - r
    x2 = int(bubble.x) + r
    y2 = int(bubble.y) + r

    h, w = img_gray.shape[:2]
    if x1 < 0 or y1 < 0 or x2 > w or y2 > h:
        return None

    return img_gray[y1:y2, x1:x2]


def calculate_fill_ratio(roi: np.ndarray, threshold: int = 128) -> float:
    """
    Calculate the proportion of dark pixels inside the bubble ROI.
    """
    if roi is None or roi.size == 0:
        return 0.0

    # Use a fixed threshold to separate ink/text from paper.
    # We use 160 because paper is usually > 200 and ink is < 100.
    # (Otsu fails on a fully filled bubble because it's not bimodal!)
    _, binary = cv2.threshold(roi, 160, 255, cv2.THRESH_BINARY_INV)

    # Create circular mask to exclude the printed outer circle
    h, w = roi.shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)
    cx, cy = w // 2, h // 2
    r_inner = max(1, min(cx, cy) - 2)
    cv2.circle(mask, (cx, cy), r_inner, 255, -1)

    # Count dark pixels inside the inner circle
    dark_pixels = cv2.countNonZero(cv2.bitwise_and(binary, binary, mask=mask))
    total_pixels = cv2.countNonZero(mask)

    if total_pixels == 0:
        return 0.0

    # The printed letter inside takes up some pixels.
    # A fully filled bubble will have a high ratio, empty will have a low ratio.
    return dark_pixels / total_pixels


def align_question_bubbles(
    img_gray: np.ndarray,
    bubbles: List[BubbleCoord],
    row_alignments: Optional[Dict[float, Tuple[float, float, float, float]]] = None,
) -> List[BubbleCoord]:
    if not bubbles:
        return []
        
    # Default without row alignments
    warped_y = bubbles[0].y + 50
    expected_x = bubbles[0].x + 50
    
    # Calculate spacing from template
    spacing = 26.3
    if len(bubbles) > 1:
        spacing = bubbles[1].x - bubbles[0].x
    
    if row_alignments and bubbles[0].y in row_alignments:
        left_x, left_y, right_x, right_y = row_alignments[bubbles[0].y]
        # The template has timing marks at X=20 and X=1065.
        # The bubbles[0].x is the relative X coordinate in the inner 1000px box.
        # The absolute PDF X is bubbles[0].x + 50.
        template_x = bubbles[0].x + 50.0
        progress = (template_x - 20.0) / (1065.0 - 20.0)
        
        expected_x = left_x + progress * (right_x - left_x)
        warped_y = left_y + progress * (right_y - left_y)

    # Search for the vertical anchor line. 
    # It was drawn at `expected_x - 12` in the warped image space.
    # The line is 12px high (-6 to +6 relative to row center).
    strip_y1 = max(0, int(warped_y) - 10)
    strip_y2 = min(img_gray.shape[0], int(warped_y) + 10)
    # Search around expected anchor position
    strip_x1 = max(0, int(expected_x) - 35)
    strip_x2 = min(img_gray.shape[1], int(expected_x) + 5)
    
    found_anchor = False
    
    if strip_x2 > strip_x1 and strip_y2 > strip_y1:
        strip = img_gray[strip_y1:strip_y2, strip_x1:strip_x2]
        # Threshold: dark pixels become white (255)
        # Using a slightly higher threshold to catch the thick black line definitively
        _, bw = cv2.threshold(strip, 160, 255, cv2.THRESH_BINARY_INV)
        
        # Look for contours that match a vertical line segment
        contours, _ = cv2.findContours(bw, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        best_diff = float('inf')
        best_cx = None
        
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            # The anchor line is drawn with thickness 2.5, which is 2-4 pixels in the image.
            # It's exactly 12px high. Allow some tolerance for scan distortion.
            if 1 < w < 8 and 8 < h < 24:
                # Calculate its center X relative to the full image
                cx = strip_x1 + x + (w / 2.0)
                expected_anchor_x = expected_x - 12.0
                
                diff = abs(cx - expected_anchor_x)
                if diff < best_diff and diff < 15:
                    best_diff = diff
                    best_cx = cx
                    
        if best_cx is not None:
            # The first bubble center is exactly 12 pixels right of the anchor
            expected_x = best_cx + 12.0
            found_anchor = True

    # If the vertical line wasn't found clearly, we fall back to the interpolated expected_x.
    aligned_bubbles = []
    for i, bubble in enumerate(bubbles):
        b_x = expected_x + i * spacing
        b_y = warped_y
        aligned_bubbles.append(BubbleCoord(x=b_x, y=b_y, radius=bubble.radius))
            
    return aligned_bubbles


def get_fill_ratios_for_question(
    img_gray: np.ndarray,
    template: OMRTemplate,
    question_number: int,
    row_alignments: Optional[Dict[float, Tuple[float, float, float, float]]] = None,
) -> List[float]:
    ratios = []
    bubbles = template.get_all_bubbles_for_question(question_number)
    aligned_bubbles = align_question_bubbles(img_gray, bubbles, row_alignments)

    for adjusted_bubble in aligned_bubbles:
        roi = extract_bubble_roi(img_gray, adjusted_bubble)
        if roi is None:
            ratios.append(0.0)
        else:
            ratio = calculate_fill_ratio(roi)
            ratios.append(ratio)
            
    if question_number in (1, 2, 50, 150):
        print(f"Q{question_number} fill ratios: {['{:.3f}'.format(r) for r in ratios]}")

    # Pad with zeros if fewer than expected options
    while len(ratios) < len(template.options):
        ratios.append(0.0)

    return ratios


def extract_bubble_crop_for_review(
    img_gray: np.ndarray,
    template: OMRTemplate,
    question_number: int,
    row_alignments: Optional[Dict[float, Tuple[float, float, float, float]]] = None,
    expand_factor: float = 3.0,
) -> Optional[np.ndarray]:
    """
    Extract a wider crop of the bubble row for the review UI.
    Shows all 5 bubbles in one crop.
    """
    bubbles = template.get_all_bubbles_for_question(question_number)
    if not bubbles:
        return None

    # Calculate adjusted coordinates
    xs = []
    ys = []
    for b in bubbles:
        warped_x = b.x + 50
        warped_y = b.y + 50
        if row_alignments and b.y in row_alignments:
            left_x, left_y, right_x, right_y = row_alignments[b.y]
            progress = (warped_x - left_x) / (right_x - left_x + 1e-6)
            warped_x = left_x + progress * (right_x - left_x)
            warped_y = left_y + progress * (right_y - left_y)
        xs.append(warped_x)
        ys.append(warped_y)

    r = bubbles[0].radius * expand_factor

    x1 = int(min(xs) - r)
    y1 = int(min(ys) - r)
    x2 = int(max(xs) + r)
    y2 = int(max(ys) + r)

    h, w = img_gray.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)

    return img_gray[y1:y2, x1:x2]
