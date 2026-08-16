# pyrefly: ignore [missing-import]
import cv2
# pyrefly: ignore [missing-import]
import numpy as np
from typing import Dict, Tuple
from app.services.omr.template import OMRTemplate


def detect_row_alignments(
    warped_gray: np.ndarray,
    template: OMRTemplate,
) -> Dict[float, Tuple[float, float, float, float]]:
    """
    Detect row timing marks and return a mapping of expected Y to 
    actual (left_x, left_y, right_x, right_y).
    """
    # Binarize the image to find black timing marks
    _, binary = cv2.threshold(warped_gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # Find contours
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    left_marks = []
    right_marks = []
    
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if 8 < w < 25 and 4 < h < 15:
            cx = x + w / 2
            cy = y + h / 2
            
            # Left margin timing marks (expected around x=20 in warped image, cx ~27.5)
            if 10 < cx < 80:
                left_marks.append((cx, cy))
            # Right margin timing marks (expected around x=1065 in warped image, cx ~1072.5)
            elif 1000 < cx < 1180:
                right_marks.append((cx, cy))
                
    left_marks.sort(key=lambda m: m[1])
    right_marks.sort(key=lambda m: m[1])
    
    row_alignments = {}
    
    for section in template.sections:
        for row in range(section.end_question - section.start_question + 1):
            # Expected Y in the warped image coordinate space (which is template space + 50 padding)
            expected_y = section.start_y + row * section.row_height + 50
            
            # Find closest left mark
            best_left_y = expected_y
            best_left_x = 20.0  # Default expected X
            if left_marks:
                closest_left = min(left_marks, key=lambda m: abs(m[1] - expected_y))
                if abs(closest_left[1] - expected_y) < 60:
                    best_left_x = closest_left[0]
                    best_left_y = closest_left[1]
                    
            # Find closest right mark
            best_right_y = expected_y
            best_right_x = 1065.0  # Default expected X
            if right_marks:
                closest_right = min(right_marks, key=lambda m: abs(m[1] - expected_y))
                if abs(closest_right[1] - expected_y) < 60:
                    best_right_x = closest_right[0]
                    best_right_y = closest_right[1]
                    
            # Use template_y (without the 50px offset) as the dictionary key
            template_y = section.start_y + row * section.row_height
            row_alignments[template_y] = (best_left_x, best_left_y, best_right_x, best_right_y)
            
    print(f"Detected {len(row_alignments)} row alignments out of expected {template.total_questions}")
    if row_alignments:
        sample_k = list(row_alignments.keys())[0]
        print(f"Sample alignment for expected Y={sample_k}: {row_alignments[sample_k]}")
        
    return row_alignments
