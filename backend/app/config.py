import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env if present
load_dotenv(BASE_DIR / ".env")

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "FORMLESS Compliance Engine")
    API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/api/v1")
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'formless.db'}")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DEFAULT_APPLICANT_ID: str = os.getenv("DEFAULT_APPLICANT_ID", "demo_applicant_01")

settings = Settings()
