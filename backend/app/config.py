from pathlib import Path
from dotenv import load_dotenv
import os

# Load .env file
load_dotenv()

# Backend root directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Workspace
WORKSPACE_DIR = BASE_DIR / "workspace"
DATA_DIR = BASE_DIR / "data"

UPLOAD_DIR = WORKSPACE_DIR / "uploads"
REPOSITORY_DIR = WORKSPACE_DIR / "repositories"

# Database
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{DATA_DIR / 'codeatlas.db'}"
)

# App
PROJECT_NAME = os.getenv("PROJECT_NAME", "CodeAtlas")
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", 8000))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")