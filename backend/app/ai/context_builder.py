import logging
from pathlib import Path
from typing import Any, Dict, List

from app.config import (
    AI_MAX_CHUNKS_PER_FILE,
    AI_MAX_INDEX_DOCUMENTS,
    AI_MAX_SOURCE_FILE_BYTES,
    AI_SOURCE_CHUNK_CHARS,
    AI_SOURCE_CHUNK_OVERLAP,
)
from app.utils.constants import IGNORE_FILES
from app.utils.helpers import should_ignore_dir

logger = logging.getLogger("codeatlas.ai.context_builder")

SOURCE_EXTENSIONS = {
    ".c", ".cc", ".cpp", ".cs", ".css", ".dart", ".go", ".h", ".hpp",
    ".html", ".java", ".js", ".jsx", ".kt", ".md", ".php", ".py", ".rb",
    ".rs", ".scss", ".sql", ".svelte", ".swift", ".toml", ".ts", ".tsx",
    ".vue", ".xml", ".yaml", ".yml",
}
SOURCE_FILE_NAMES = {
    "dockerfile", "go.mod", "package.json", "pipfile", "pom.xml", "pubspec.yaml",
    "readme", "requirements.txt",
}
SENSITIVE_FILE_NAMES = {
    "credentials.json", "id_dsa", "id_ed25519", "id_rsa", "secrets.json",
}
SENSITIVE_SUFFIXES = {".key", ".p12", ".pem", ".pfx"}
SKIPPED_GENERATED_SUFFIXES = {".map", ".min.css", ".min.js"}
LOCK_FILE_NAMES = {
    "bun.lock", "cargo.lock", "composer.lock", "package-lock.json", "pnpm-lock.yaml",
    "poetry.lock", "uv.lock", "yarn.lock",
}


def classify_document(file_path: str, language: str) -> str:
    normalized = file_path.replace("\\", "/").lower()
    path = Path(normalized)
    name = path.name

    if name.startswith("readme") or name in {"changelog.md", "contributing.md"} or "docs/" in normalized:
        return "Documentation"
    if name in {
        "build.gradle", "cargo.toml", "composer.json", "go.mod", "package.json",
        "pipfile", "pom.xml", "pubspec.yaml", "pyproject.toml", "requirements.txt",
    }:
        return "Manifest"
    if name in {
        "docker-compose.yaml", "docker-compose.yml", "dockerfile", "tailwind.config.js",
        "tsconfig.json", "vite.config.js", "vite.config.ts", "webpack.config.js",
    }:
        return "Configuration"
    if path.suffix in SOURCE_EXTENSIONS and language not in {"CSS", "HTML", "Markdown", "Unknown", "XML", "YAML"}:
        return "Source Code"
    return "Documentation"


def is_safe_source_file(file_info: Dict[str, Any], full_path: Path) -> bool:
    relative_path = Path(file_info.get("path", ""))
    name = relative_path.name.lower()
    normalized = str(relative_path).replace("\\", "/").lower()

    if not name or should_ignore_dir(relative_path):
        return False
    if name in IGNORE_FILES or name.startswith(".env"):
        return False
    if name in SENSITIVE_FILE_NAMES or relative_path.suffix.lower() in SENSITIVE_SUFFIXES:
        return False
    if name in LOCK_FILE_NAMES or any(normalized.endswith(suffix) for suffix in SKIPPED_GENERATED_SUFFIXES):
        return False
    if relative_path.suffix.lower() not in SOURCE_EXTENSIONS and name not in SOURCE_FILE_NAMES:
        return False
    if not full_path.exists() or not full_path.is_file():
        return False
    return full_path.stat().st_size <= AI_MAX_SOURCE_FILE_BYTES


def chunk_source(text: str) -> List[Dict[str, Any]]:
    chunks: List[Dict[str, Any]] = []
    start = 0

    while start < len(text) and len(chunks) < AI_MAX_CHUNKS_PER_FILE:
        end = min(len(text), start + AI_SOURCE_CHUNK_CHARS)
        if end < len(text):
            newline = text.rfind("\n", start + int(AI_SOURCE_CHUNK_CHARS * 0.6), end)
            if newline > start:
                end = newline + 1

        content = text[start:end].strip()
        if content:
            chunks.append({
                "content": content,
                "line_start": text.count("\n", 0, start) + 1,
                "line_end": text.count("\n", 0, end) + 1,
            })

        if end >= len(text):
            break
        start = max(start + 1, end - AI_SOURCE_CHUNK_OVERLAP)

    return chunks


def _symbol_text(symbols: List[Dict[str, Any]]) -> str:
    if not symbols:
        return "No extracted symbols are available for this file."
    lines = ["Extracted symbols:"]
    for symbol in symbols:
        lines.append(
            f"- {symbol.get('type')} '{symbol.get('name')}' "
            f"(lines {symbol.get('start_line')}-{symbol.get('end_line')})"
        )
    return "\n".join(lines)


def build_context_documents(
    project_id: str,
    knowledge: Dict[str, Any],
    source_path: Path,
) -> List[Dict[str, Any]]:
    """Build structured-first documents plus safe, bounded local source excerpts."""
    metadata = knowledge.get("metadata", {})
    statistics = knowledge.get("statistics", {})
    architecture = knowledge.get("architecture", {})
    files = knowledge.get("files", [])

    documents: List[Dict[str, Any]] = [{
        "type": "project_overview",
        "file_path": "project_summary.json",
        "content": (
            f"Project: {metadata.get('project_name', 'Unnamed Project')}\n"
            f"Project ID: {project_id}\n"
            f"Files: {statistics.get('total_files', 0)}\n"
            f"Directories: {statistics.get('total_directories', 0)}\n"
            f"Total size: {statistics.get('total_size', 0)} bytes\n"
            f"Frameworks: {', '.join(architecture.get('frameworks', [])) or 'None detected'}\n"
            f"Architecture: backend={architecture.get('backend', False)}, "
            f"frontend={architecture.get('frontend', False)}, api={architecture.get('api', False)}, "
            f"database={architecture.get('database', False)}, ai={architecture.get('ai', False)}"
        ),
        "classification": "Generated Metadata",
        "symbols": [],
    }]

    safe_files: List[tuple[Dict[str, Any], Path, str]] = []
    for file_info in files:
        relative_path = file_info.get("path", "")
        full_path = source_path / relative_path
        if not is_safe_source_file(file_info, full_path):
            continue

        symbols = file_info.get("symbols", [])
        classification = classify_document(relative_path, file_info.get("language", ""))
        documents.append({
            "type": "file_metadata",
            "file_path": relative_path,
            "content": (
                f"File Path: {relative_path}\n"
                f"Language: {file_info.get('language', 'Unknown')}\n"
                f"Size: {file_info.get('size', 0)} bytes\n"
                f"{_symbol_text(symbols)}"
            ),
            "classification": classification,
            "symbols": symbols,
        })
        safe_files.append((file_info, full_path, classification))
        if len(documents) >= AI_MAX_INDEX_DOCUMENTS:
            return documents

    for file_info, full_path, classification in safe_files:
        try:
            source_text = full_path.read_text(encoding="utf-8", errors="ignore")
        except OSError as error:
            logger.warning("Could not read local source context for %s: %s", file_info.get("path"), error)
            continue

        for index, chunk in enumerate(chunk_source(source_text)):
            documents.append({
                "type": "source_chunk",
                "file_path": file_info.get("path"),
                "content": (
                    f"Local source excerpt from {file_info.get('path')} "
                    f"(lines {chunk['line_start']}-{chunk['line_end']}):\n"
                    f"{chunk['content']}"
                ),
                "classification": classification,
                "symbols": file_info.get("symbols", []),
                "chunk_index": index,
                "line_start": chunk["line_start"],
                "line_end": chunk["line_end"],
            })
            if len(documents) >= AI_MAX_INDEX_DOCUMENTS:
                return documents

    return documents
