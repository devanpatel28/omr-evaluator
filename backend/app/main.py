"""
OMR Evaluation System — FastAPI Backend
OMRly
"""
import logging
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Request
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles
# pyrefly: ignore [missing-import]
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.api import tests, answer_key, evaluations, export, templates, scan


# ── Suppress noisy scan-status polling from uvicorn access log ──────────────
class _ScanStatusFilter(logging.Filter):
    """Drop GET /api/scan/.../status lines from uvicorn.access logs."""
    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        return "/api/scan/" not in msg or "/status" not in msg

for _logger_name in ("uvicorn.access", "uvicorn"):
    _log = logging.getLogger(_logger_name)
    _log.addFilter(_ScanStatusFilter())


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Initialize database tables
    init_db()
    # Ensure default template exists
    from app.services.omr.template import ensure_default_template
    ensure_default_template(settings.TEMPLATES_DIR)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Local-first OMR Sheet Evaluation System for OMRly",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve mobile scan page as static files
import pathlib
_static_dir = pathlib.Path(__file__).parent / "static"
_static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")

# Register API routers
app.include_router(tests.router)
app.include_router(answer_key.router)
app.include_router(evaluations.router)
app.include_router(export.router)
app.include_router(templates.router)
app.include_router(scan.router)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/api/settings")
def get_settings():
    """Return current OMR processing settings."""
    return {
        "fill_threshold": settings.OMR_FILL_THRESHOLD,
        "confidence_threshold": settings.OMR_CONFIDENCE_THRESHOLD,
        "ambiguity_margin": settings.OMR_AMBIGUITY_MARGIN,
        "page_width": settings.OMR_PAGE_WIDTH,
        "page_height": settings.OMR_PAGE_HEIGHT,
    }


@app.get("/scan/{code}", response_class=HTMLResponse)
def serve_scan_page(request: Request, code: str):
    """Serve the mobile camera scan page with the code pre-filled."""
    import pathlib
    html_path = pathlib.Path(__file__).parent / "static" / "scan.html"
    if not html_path.exists():
        return HTMLResponse("Scan page not found", status_code=404)
    html = html_path.read_text(encoding="utf-8")
    # Inject the code and backend origin
    origin = str(request.base_url).rstrip("/")
    html = html.replace("__SCAN_CODE__", code).replace("__BACKEND_ORIGIN__", origin)
    return HTMLResponse(html)
