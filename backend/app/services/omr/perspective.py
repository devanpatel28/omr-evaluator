"""
Perspective correction — transforms the detected sheet to a flat, normalized view.
"""
import cv2
import numpy as np
from app.services.omr.sheet_detection import order_points


def perspective_transform(
    img: np.ndarray,
    corners: np.ndarray,
    target_width: int = 1100,
    target_height: int = 1500,
) -> np.ndarray:
    """
    Apply perspective transformation to normalize the sheet.
    
    Args:
        img: Original BGR image
        corners: 4×2 array of detected corner points
        target_width: Output image width (includes margins)
        target_height: Output image height (includes margins)
    
    Returns:
        Warped (corrected) image of size (target_height, target_width)
    """
    ordered = order_points(corners)

    # The corners map to (50, 50), (1050, 50), (1050, 1450), (50, 1450)
    # This preserves the 50px margin around the 1000x1400 template where timing marks live.
    dst = np.array([
        [50, 50],
        [target_width - 50, 50],
        [target_width - 50, target_height - 50],
        [50, target_height - 50],
    ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(ordered, dst)
    warped = cv2.warpPerspective(img, M, (target_width, target_height))
    return warped


def auto_rotate_upright(warped: np.ndarray) -> np.ndarray:
    """
    Ensure the warped sheet is upright (portrait, not landscape/upside-down).
    Checks aspect ratio; if width > height, rotates 90°.
    """
    h, w = warped.shape[:2]
    if w > h:
        # Rotate 90° clockwise
        warped = cv2.rotate(warped, cv2.ROTATE_90_CLOCKWISE)
    return warped
