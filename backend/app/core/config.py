import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "OMR Evaluation System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    # Data directories — relative to project root
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    DATABASE_DIR: Path = DATA_DIR / "database"
    TESTS_DIR: Path = DATA_DIR / "tests"
    EVALUATIONS_DIR: Path = DATA_DIR / "evaluations"
    TEMPLATES_DIR: Path = DATA_DIR / "templates"

    @property
    def DATABASE_URL(self) -> str:
        return f"sqlite:///{self.DATABASE_DIR / 'omr.sqlite'}"

    # OMR Detection parameters
    OMR_FILL_THRESHOLD: float = 0.35          # Minimum fill ratio to consider a bubble marked
    OMR_CONFIDENCE_THRESHOLD: float = 0.80    # Below this → flag as low confidence
    OMR_AMBIGUITY_MARGIN: float = 0.10        # If top-2 bubbles are within this margin → AMBIGUOUS
    OMR_MIN_BUBBLE_FILL: float = 0.15         # Absolute minimum fill to be considered
    OMR_MAX_BUBBLES_FILLED: int = 1           # Max bubbles allowed before marking AMBIGUOUS

    # Normalized page dimensions after perspective correction
    OMR_PAGE_WIDTH: int = 1000
    OMR_PAGE_HEIGHT: int = 1400

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Ensure data directories exist
for directory in [
    settings.DATABASE_DIR,
    settings.TESTS_DIR,
    settings.EVALUATIONS_DIR,
    settings.TEMPLATES_DIR,
]:
    directory.mkdir(parents=True, exist_ok=True)
