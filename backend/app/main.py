"""
OMR Evaluation System — FastAPI Backend
OMRly
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.api import tests, answer_key, evaluations, export, templates


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

# Register API routers
app.include_router(tests.router)
app.include_router(answer_key.router)
app.include_router(evaluations.router)
app.include_router(export.router)
app.include_router(templates.router)


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
