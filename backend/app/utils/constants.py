class ProjectStatus:
    CREATED = "CREATED"
    IMPORTING = "IMPORTING"
    READY = "READY"
    SCANNING = "SCANNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ProjectSource:
    ZIP = "ZIP"
    FOLDER = "FOLDER"
    FILES = "FILES"
    GITHUB = "GITHUB"


IGNORE_FOLDERS = {
    ".venv",
    "venv",
    "__pycache__",
    ".git",
    ".github",
    ".idea",
    ".vscode",
    "node_modules",
    "dist",
    "build",
    "uploads",
    "chroma_db",
    ".pytest_cache",
}

IGNORE_FILES = {
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    ".env.test",
}