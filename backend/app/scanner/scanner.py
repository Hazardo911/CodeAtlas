from pathlib import Path
from collections import Counter


LANGUAGE_MAP = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".java": "Java",
    ".go": "Go",
    ".rs": "Rust",
    ".cpp": "C++",
    ".c": "C",
    ".cs": "C#",
    ".json": "JSON",
    ".md": "Markdown",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".toml": "TOML",
}


class Scanner:

    def scan(self, project_path: Path):

        summary = {
            "total_files": 0,
            "total_directories": 0,
            "languages": {},
            "files": [],
        }

        language_counter = Counter()

        for item in project_path.rglob("*"):

            if item.is_dir():
                summary["total_directories"] += 1
                continue

            summary["total_files"] += 1

            relative_path = item.relative_to(project_path)

            extension = item.suffix.lower()

            summary["files"].append(
                {
                    "path": str(relative_path),
                    "name": item.name,
                    "extension": extension,
                    "language": LANGUAGE_MAP.get(
                        extension,
                        "Unknown"
                    ),
                    "size": item.stat().st_size,
                }
            )

            extension = item.suffix.lower()

            if extension in LANGUAGE_MAP:
                language_counter[
                    LANGUAGE_MAP[extension]
                ] += 1

        summary["languages"] = dict(language_counter)

        return summary