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
    "env",
    "venv",
    ".venv",
    "node_modules",
    ".git",
    "__pycache__",
    "build",
    "dist",
    "uploads",
    "chroma_db",
    ".cache",
    ".idea",
    ".vscode",
    "target",
    "out",
    "coverage",
    ".pytest_cache",
    ".mypy_cache",
}

IGNORE_FILES = {
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    ".env.test",
}