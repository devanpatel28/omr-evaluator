import io
from typing import Optional
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image
from app.services.omr.template import OMRTemplate


def generate_omr_sheet_pdf(
    template: OMRTemplate,
    institute_name: Optional[str] = None,
    exam_name: Optional[str] = None,
    logo_bytes: Optional[bytes] = None,
) -> bytes:
    """
    Generates a PDF for the given OMR Template.
    Adds corner markers so the scanner can perfectly align it.
    """
    buffer = io.BytesIO()
    # The template is 1000x1400. We pad by 50 points on each side for the corner markers.
    # So the total page size is 1100x1500 points.
    page_width = 1100
    page_height = 1500

    c = canvas.Canvas(buffer, pagesize=(page_width, page_height))

    # Draw Corner Registration Marks (40x40 black squares)
    c.setFillColorRGB(0, 0, 0)
    marker_size = 40
    half = marker_size / 2
    
    # We want the centroids of these markers to be at:
    # (50, 50), (1050, 50), (1050, 1450), (50, 1450)
    # The `rect` coordinates in ReportLab are bottom-left corner of the rect.
    # So x = centroid_x - half, y = centroid_y - half
    
    # Bottom-Left
    c.rect(50 - half, 50 - half, marker_size, marker_size, fill=1, stroke=0)
    # Bottom-Right
    c.rect(1050 - half, 50 - half, marker_size, marker_size, fill=1, stroke=0)
    # Top-Right
    c.rect(1050 - half, 1450 - half, marker_size, marker_size, fill=1, stroke=0)
    # Top-Left
    c.rect(50 - half, 1450 - half, marker_size, marker_size, fill=1, stroke=0)

    # Helper function to map template (0,0 top-left) coordinates to PDF (0,0 bottom-left) coordinates,
    # with the 50pt padding applied.
    def map_coord(tx: float, ty: float):
        # Template width=1000, height=1400.
        # Top-left in template (0,0) becomes (50, 1450) in PDF.
        return tx + 50, 1450 - ty

    # Draw Header Section
    c.setFont("Helvetica-Bold", 36)
    header_y = 1450 - 60  # Near the top

    if logo_bytes:
        try:
            img_io = io.BytesIO(logo_bytes)
            # Use PIL to read image, check format
            pil_img = Image.open(img_io)
            # Convert to RGB to ensure compatibility with reportlab if it's RGBA or something
            if pil_img.mode != "RGB":
                pil_img = pil_img.convert("RGB")
                
            img_io_rgb = io.BytesIO()
            pil_img.save(img_io_rgb, format="JPEG")
            img_io_rgb.seek(0)
            
            logo_img = ImageReader(img_io_rgb)
            # draw at x=100, y=1450-130
            # logo width ~150, height ~100
            c.drawImage(logo_img, 100, 1450 - 150, width=150, height=100, preserveAspectRatio=True, mask='auto')
        except Exception as e:
            print(f"Error drawing logo: {e}")

    c.drawCentredString(page_width / 2, header_y, institute_name or "OMRly")
    
    c.setFont("Helvetica", 24)
    c.drawCentredString(page_width / 2, header_y - 40, exam_name or "OMR Sheet - 200 Questions")

    # Instructions box or student details can go here, but we keep it simple for now.
    c.setFont("Helvetica", 14)
    c.drawString(100, 1450 - 220, "Name: _________________________________________")
    c.drawString(600, 1450 - 220, "Date: ________________________")

    # Draw Bubbles Grid
    # Set thin line for bubble outlines
    c.setLineWidth(1)
    
    # Group questions by section
    for section in template.sections:
        for q_num in range(section.start_question, section.end_question + 1):
            row = q_num - section.start_question
            # Get Y center of the row in template space
            cy_t = section.start_y + row * section.row_height
            
            # Map Y center to PDF space
            _, pdf_y = map_coord(0, cy_t)
            # Draw row timing marks on the far left and right margins
            c.setFillColorRGB(0, 0, 0)
            c.rect(20, pdf_y - 3, 15, 6, fill=1, stroke=0)      # Left timing mark
            c.rect(1065, pdf_y - 3, 15, 6, fill=1, stroke=0)    # Right timing mark
            
            # Reset colors for text and bubbles
            c.setStrokeColorRGB(0, 0, 0)
            c.setFillColorRGB(0, 0, 0)
            c.setLineWidth(1)
            
            # Draw the question number, shifted left to isolate the anchor line
            c.setFont("Helvetica-Bold", 10)
            c.drawRightString(section.start_x + 50 - 25, pdf_y - 3, str(q_num))
            
            # Draw a thick vertical line as a detection anchor
            # PDF coordinates:
            # First bubble X is at: map_coord(section.start_x, 0)[0]
            first_bubble_pdf_x, _ = map_coord(section.start_x, 0)
            anchor_x = first_bubble_pdf_x - 12
            
            c.setStrokeColorRGB(0, 0, 0)
            c.setLineWidth(2.5) # thick enough to be easily found by OpenCV
            c.line(anchor_x, pdf_y - 6, anchor_x, pdf_y + 6)
            c.setLineWidth(1) # reset

            # If it's the first row of a section, draw the ABCDE header!
            if row == 0:
                c.setFont("Helvetica-Bold", 8)
                for i, opt in enumerate(template.options):
                    cx_t = section.start_x + i * section.option_spacing
                    pdf_x, pdf_header_y = map_coord(cx_t, cy_t - 15)  # 15px above the first row
                    c.drawCentredString(pdf_x, pdf_header_y, opt)
            
            c.setLineWidth(1) # Reset for bubbles
            
            # Draw Bubbles
            for i, opt in enumerate(template.options):
                cx_t = section.start_x + i * section.option_spacing
                pdf_x, _ = map_coord(cx_t, 0)
                
                # Draw outer circle (empty)
                c.circle(pdf_x, pdf_y, section.bubble_radius, stroke=1, fill=0)

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()
