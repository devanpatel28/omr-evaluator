import cv2
import numpy as np
from typing import Optional, Tuple


def _find_corner_marker(region: np.ndarray, offset_x: int, offset_y: int,
                         corner_xy: Tuple[float, float]) -> Optional[Tuple[float, float]]:
    """
    Find the solid black square registration marker inside a small search
    region near one corner of the sheet, and return its centroid in full
    image coordinates. Picks the blob closest to the true image corner
    that also looks like a filled square (not a bubble outline or text).
    """
    contours, _ = cv2.findContours(region, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    best = None
    best_dist = None
    for c in contours:
        area = cv2.contourArea(c)
        x, y, w, h = cv2.boundingRect(c)
        if w == 0 or h == 0:
            continue
        aspect = w / float(h)
        extent = area / float(w * h)  # filled-square ratio; low for rings/text

        # Registration squares are small, roughly square, and solidly filled
        # We allow up to area 50000 to support high-resolution scans.
        if not (20 < area < 50000 and 0.5 < aspect < 2.0 and extent > 0.45):
            continue

        cx, cy = x + offset_x + w / 2, y + offset_y + h / 2
        dist = (cx - corner_xy[0]) ** 2 + (cy - corner_xy[1]) ** 2
        if best is None or dist < best_dist:
            best, best_dist = (cx, cy), dist

    return best


def detect_corner_markers(img: np.ndarray, search_fracs=(0.12, 0.18, 0.25)) -> Optional[np.ndarray]:
    """
    Detect the 4 solid black square registration/alignment marks printed in
    the corners of the sheet.

    Returns a 4x2 array [top-left, top-right, bottom-right, bottom-left],
    or None if any of the 4 corners can't be confidently located.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img.copy()
    h, w = gray.shape[:2]
    _, bw = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY_INV)

    for frac in search_fracs:
        m = max(30, int(frac * min(h, w)))

        tl = _find_corner_marker(bw[0:m, 0:m], 0, 0, (0, 0))
        tr = _find_corner_marker(bw[0:m, w - m:w], w - m, 0, (w, 0))
        br = _find_corner_marker(bw[h - m:h, w - m:w], w - m, h - m, (w, h))
        bl = _find_corner_marker(bw[h - m:h, 0:m], 0, h - m, (0, h))

        if tl and tr and br and bl:
            pts = np.array([tl, tr, br, bl], dtype=np.float32)

            # Sanity check: the 4 marks should form a reasonably large,
            # convex, roughly rectangular region — not 4 unrelated blobs.
            area = cv2.contourArea(pts)
            if area >= (w * h) * 0.30 and cv2.isContourConvex(
                pts.reshape(4, 1, 2).astype(np.int32)
            ):
                return pts
            # otherwise keep trying a larger search window

    return None


def detect_sheet_contour(img: np.ndarray) -> Optional[np.ndarray]:
    """
    Detect the OMR sheet boundary in the image via its outer edge.

    Strategy:
    1. Edge detection (Canny)
    2. Find contours
    3. Sort by area, largest quadrilateral is the sheet

    Only useful when there's visible background around the physical
    paper (e.g. a photo on a desk). For full-bleed scans/renders, use
    detect_corner_markers() instead.

    Returns:
        4x2 array of corner points in image coordinates, or None if not found
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img.copy()
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Canny edge detection — auto thresholds using Otsu's
    otsu_thresh, _ = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    edges = cv2.Canny(blurred, otsu_thresh * 0.5, otsu_thresh)

    # Dilate edges slightly to connect broken lines
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=1)

    # Find contours
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return None

    # Sort by area descending
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    img_area = img.shape[0] * img.shape[1]

    for contour in contours[:10]:  # Check top 10 largest
        area = cv2.contourArea(contour)

        # Sheet should be at least 40% of image area (to avoid picking up internal tables)
        if area < img_area * 0.40:
            continue

        # Approximate polygon
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)

        if len(approx) == 4:
            return approx.reshape(4, 2).astype(np.float32)

    # Fallback: Try with looser approximation on largest contour
    for contour in contours[:5]:
        area = cv2.contourArea(contour)
        if area < img_area * 0.40:
            continue
        peri = cv2.arcLength(contour, True)
        for epsilon_factor in [0.03, 0.04, 0.05, 0.08]:
            approx = cv2.approxPolyDP(contour, epsilon_factor * peri, True)
            if len(approx) == 4:
                return approx.reshape(4, 2).astype(np.float32)

    # Last resort: use bounding rect of largest contour
    if contours:
        largest = contours[0]
        area = cv2.contourArea(largest)
        if area >= img_area * 0.40:
            x, y, w, h = cv2.boundingRect(largest)
            return np.array([
                [x, y],
                [x + w, y],
                [x + w, y + h],
                [x, y + h],
            ], dtype=np.float32)

    return None


def order_points(pts: np.ndarray) -> np.ndarray:
    """
    Order 4 corner points as: top-left, top-right, bottom-right, bottom-left.
    """
    rect = np.zeros((4, 2), dtype=np.float32)

    # Sum: top-left has min sum, bottom-right has max sum
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # top-left
    rect[2] = pts[np.argmax(s)]   # bottom-right

    # Difference: top-right has min diff, bottom-left has max diff
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right
    rect[3] = pts[np.argmax(diff)]  # bottom-left

    return rect


def use_full_image_as_sheet(img: np.ndarray) -> np.ndarray:
    """
    Fallback: treat the entire image as the sheet boundary.
    Useful when the image is already a clean scan with no surrounding background.
    """
    h, w = img.shape[:2]
    return np.array([
        [0, 0],
        [w, 0],
        [w, h],
        [0, h],
    ], dtype=np.float32)


def detect_sheet(img: np.ndarray) -> np.ndarray:
    """
    Main entry point. Tries strategies in order of reliability:
      1. Corner registration-mark detection (best for full-bleed sheets
         like scans/generated images with no background margin).
      2. Contour-based outer page edge (best for photos with visible
         background around the physical paper).
      3. Full image as-is.

    Always returns a 4x2 array of points ordered tl, tr, br, bl — never
    None — so callers don't need extra None-handling.
    """
    pts = detect_corner_markers(img)
    if pts is not None:
        return order_points(pts)

    pts = detect_sheet_contour(img)
    if pts is not None:
        return order_points(pts)

    return use_full_image_as_sheet(img)