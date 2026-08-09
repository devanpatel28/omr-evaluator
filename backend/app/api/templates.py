import json
from typing import List, Optional
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Form, UploadFile, File
# pyrefly: ignore [missing-import]
from fastapi.responses import StreamingResponse
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
import io
from app.core.config import settings
from app.services.omr.template import (
    OMRTemplate, GridSection, load_template, save_template,
    create_default_gca_template, ensure_default_template
)
from app.services.files.omr_generator import generate_omr_sheet_pdf

router = APIRouter(prefix="/api/templates", tags=["templates"])


class SectionData(BaseModel):
    start_question: int
    end_question: int
    start_x: float
    start_y: float
    row_height: float
    option_spacing: float
    bubble_radius: float


class TemplateCreate(BaseModel):
    name: str
    page_width: int = 1000
    page_height: int = 1400
    total_questions: int = 200
    options: List[str] = ["A", "B", "C", "D", "E"]
    sections: List[SectionData]


@router.post("/generate")
async def generate_sheet(
    institute_name: Optional[str] = Form(None),
    exam_name: Optional[str] = Form(None),
    logo: Optional[UploadFile] = File(None),
    format: str = Form("pdf")
):
    template = ensure_default_template(settings.TEMPLATES_DIR)
    logo_bytes = await logo.read() if logo else None
    
    pdf_bytes = generate_omr_sheet_pdf(
        template=template,
        institute_name=institute_name,
        exam_name=exam_name,
        logo_bytes=logo_bytes
    )
    
    if format.lower() == "png":
        import fitz  # pymupdf
        # Render the first page of the PDF to a PNG image
        doc = fitz.open("pdf", pdf_bytes)
        page = doc[0]
        # Use a high resolution (e.g. 300 DPI -> scale by ~4.16 from 72 DPI)
        pix = page.get_pixmap(matrix=fitz.Matrix(3, 3))
        png_bytes = pix.tobytes("png")
        doc.close()
        return StreamingResponse(
            io.BytesIO(png_bytes),
            media_type="image/png",
            headers={"Content-Disposition": "attachment; filename=omr_sheet.png"}
        )
    
    # Default to PDF
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=omr_sheet.pdf"}
    )

@router.get("")
def list_templates():
    """List all available templates."""
    templates = []
    for path in settings.TEMPLATES_DIR.glob("*.json"):
        try:
            tmpl = load_template(str(path))
            templates.append({
                "id": path.stem,
                "name": tmpl.name,
                "total_questions": tmpl.total_questions,
                "options": tmpl.options,
                "path": str(path),
            })
        except Exception:
            pass
    return templates


@router.get("/default")
def get_default_template():
    """Get or create the default OMRly template."""
    template = ensure_default_template(settings.TEMPLATES_DIR)
    return template.to_dict()


@router.get("/{template_id}")
def get_template(template_id: str):
    path = settings.TEMPLATES_DIR / f"{template_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Template not found")
    template = load_template(str(path))
    return template.to_dict()


@router.post("")
def create_template(data: TemplateCreate):
    sections = [GridSection(**s.model_dump()) for s in data.sections]
    template = OMRTemplate(
        name=data.name,
        page_width=data.page_width,
        page_height=data.page_height,
        total_questions=data.total_questions,
        options=data.options,
        sections=sections,
    )
    # Generate safe filename
    safe_name = data.name.lower().replace(" ", "-").replace("/", "-")[:50]
    path = settings.TEMPLATES_DIR / f"{safe_name}.json"
    save_template(template, str(path))
    return {"success": True, "id": safe_name, "name": data.name}


@router.put("/{template_id}")
def update_template(template_id: str, data: TemplateCreate):
    path = settings.TEMPLATES_DIR / f"{template_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Template not found")
    sections = [GridSection(**s.model_dump()) for s in data.sections]
    template = OMRTemplate(
        name=data.name,
        page_width=data.page_width,
        page_height=data.page_height,
        total_questions=data.total_questions,
        options=data.options,
        sections=sections,
    )
    save_template(template, str(path))
    return {"success": True, "id": template_id}


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: str):
    path = settings.TEMPLATES_DIR / f"{template_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Template not found")
    path.unlink()

    path.unlink()
