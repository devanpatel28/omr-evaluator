import os
import sys
import asyncio

# Adjust path if needed
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.test import Test
from app.services.omr.pipeline import process_omr_image
from app.services.omr.template import ensure_default_template

def main():
    from app.core.config import settings
    template = ensure_default_template(settings.TEMPLATES_DIR)
    
    img_path = r"E:\SOFTWARE\SETUP\OMR\omr-evaluator\data\evaluations\tmp\1ad21f2483884645b4a58fa1fed7bbb8\original.png"
    if not os.path.exists(img_path):
        print("Image not found")
        return
        
    print(f"Processing {img_path}...")
    
    # Optional debug to check what detect_row_alignments finds
    from app.services.omr.pipeline import load_image, check_image_quality, preprocess_for_detection, to_grayscale, perspective_transform, auto_rotate_upright
    from app.services.omr.sheet_detection import detect_sheet
    from app.services.omr.timing_marks import detect_row_alignments
    
    try:
        img = load_image(img_path)
        corners = detect_sheet(img)
        warped = perspective_transform(img, corners, target_width=1100, target_height=1500)
        warped = auto_rotate_upright(warped)
        warped_gray = to_grayscale(warped)
        
        row_alignments = detect_row_alignments(warped_gray, template)
        print(f"Detected {len(row_alignments)} row alignments out of expected {len(template.sections) * (template.sections[0].end_question - template.sections[0].start_question + 1) if template.sections else 0}")
        if row_alignments:
            first_key = list(row_alignments.keys())[0]
            print(f"Sample alignment for expected Y={first_key}: {row_alignments[first_key]}")
    except Exception as e:
        print(f"Error debugging timing marks: {e}")
        
    result = process_omr_image(
        image_path=img_path,
        template=template,
        total_questions=200,
        generate_debug_image=True,
        output_dir=os.path.dirname(img_path),
        generate_bubble_crops=False
    )
    
    if result.success:
        print(f"Success! Detected {len(result.detected_answers)} answers.")
        for step in result.steps:
            print(f"[{step.status}] {step.name}: {step.message}")
    else:
        print(f"Failed: {result.error}")
        for step in result.steps:
            print(f"[{step.status}] {step.name}: {step.message}")
            
if __name__ == "__main__":
    main()
