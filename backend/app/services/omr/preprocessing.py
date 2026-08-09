"""
Image preprocessing pipeline for OMR sheets.
Normalizes image quality before sheet detection and bubble reading.
"""
import cv2
import numpy as np
from typing import Tuple


def load_image(image_path: str) -> np.ndarray:
    """Load image from file path."""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image from: {image_path}")
    return img


def load_image_from_bytes(image_bytes: bytes) -> np.ndarray:
    """Load image from raw bytes."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image from bytes")
    return img


def resize_image(img: np.ndarray, max_dim: int = 2000) -> np.ndarray:
    """
    Resize image so the largest dimension is max_dim, preserving aspect ratio.
    Prevents very large images from slowing down processing.
    """
    h, w = img.shape[:2]
    if max(h, w) <= max_dim:
        return img
    scale = max_dim / max(h, w)
    new_w = int(w * scale)
    new_h = int(h * scale)
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)


def to_grayscale(img: np.ndarray) -> np.ndarray:
    """Convert BGR image to grayscale."""
    if len(img.shape) == 2:
        return img  # already grayscale
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def reduce_noise(gray: np.ndarray) -> np.ndarray:
    """
    Apply Gaussian blur for noise reduction.
    Kernel size 5x5 is effective for most scanned/photographed OMR sheets.
    """
    return cv2.GaussianBlur(gray, (5, 5), 0)


def threshold_image(gray: np.ndarray, method: str = "otsu") -> np.ndarray:
    """
    Apply thresholding to create binary image.
    
    Args:
        gray: Grayscale input image
        method: 'otsu' | 'adaptive'
    
    Returns:
        Binary image (0=black, 255=white)
    """
    if method == "adaptive":
        return cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            blockSize=21,
            C=10,
        )
    else:  # Otsu
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        return binary


def apply_morphology(binary: np.ndarray, operation: str = "close") -> np.ndarray:
    """
    Apply morphological operations to clean up binary image.
    'close' = fill small holes in bubbles.
    'open'  = remove noise/small particles.
    """
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    if operation == "close":
        return cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=1)
    elif operation == "open":
        return cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
    elif operation == "dilate":
        return cv2.dilate(binary, kernel, iterations=1)
    elif operation == "erode":
        return cv2.erode(binary, kernel, iterations=1)
    return binary


def adjust_contrast_brightness(img: np.ndarray) -> np.ndarray:
    """
    Enhance contrast and brightness to improve OMR detection.
    Uses CLAHE (Contrast Limited Adaptive Histogram Equalization) in LAB color space
    to handle uneven lighting and shadows effectively.
    """
    if len(img.shape) == 2:
        # Already grayscale
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        return clahe.apply(img)
        
    # Convert to LAB color space
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # Apply CLAHE to the lightness channel (L)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    
    # Merge channels and convert back to BGR
    limg = cv2.merge((cl, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)


def preprocess_for_detection(img: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Full preprocessing pipeline for sheet contour detection.
    
    Returns:
        (gray, binary) — grayscale and binary-inverted images
    """
    resized = resize_image(img, max_dim=2000)
    resized = adjust_contrast_brightness(resized)
    gray = to_grayscale(resized)
    blurred = reduce_noise(gray)
    binary = threshold_image(blurred, method="otsu")
    binary = apply_morphology(binary, "close")
    return gray, binary


def preprocess_for_bubbles(warped_gray: np.ndarray) -> np.ndarray:
    """
    Preprocessing specifically for bubble fill detection on the normalized sheet.
    Uses adaptive thresholding to handle uneven illumination.
    """
    blurred = reduce_noise(warped_gray)
    binary = threshold_image(blurred, method="adaptive")
    return binary


def check_image_quality(img: np.ndarray) -> dict:
    """
    Basic quality checks on the uploaded image.
    Returns a dict with is_ok, warnings, errors.
    """
    result = {"is_ok": True, "warnings": [], "errors": []}

    h, w = img.shape[:2]

    # Minimum resolution check
    if w < 400 or h < 400:
        result["errors"].append("Image resolution is too low. Minimum 400×400 px required.")
        result["is_ok"] = False

    # Blurriness check using Laplacian variance
    gray = to_grayscale(img)
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    if lap_var < 50:
        result["warnings"].append(f"Image appears blurry (sharpness score: {lap_var:.1f}). Detection may be unreliable.")

    # Brightness check
    mean_brightness = float(gray.mean())
    if mean_brightness < 30:
        result["warnings"].append("Image is very dark. Detection may be unreliable.")
    elif mean_brightness > 230:
        result["warnings"].append("Image is very bright/overexposed. Detection may be unreliable.")

    return result
