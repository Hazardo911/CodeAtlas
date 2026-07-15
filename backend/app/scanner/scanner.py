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
    ".html": "HTML",
    ".htm": "HTML",
    ".css": "CSS",
    ".sql": "SQL",
    ".xml": "XML",
}

SPECIAL_FILES = {
    "dockerfile": "Dockerfile",
    "requirements.txt": "Pip Requirements",
    "package.json": "npm config",
    "pom.xml": "Maven Config",
    "build.gradle": "Gradle Config",
}


class Scanner:
    """
    Scans a project directory recursively, mapping files to programming languages
    and extracting basic file metadata.
    """

    def scan(self, project_path: Path) -> dict:
        """
        Walks the directory and gathers statistics on files, directories, and languages.

        Args:
            project_path (Path): Path to the source directory to scan.

        Returns:
            dict: Summary containing total counts, file lists, and language statistics.
        """
        from app.utils.helpers import should_ignore_dir

        summary = {
            "total_files": 0,
            "total_directories": 0,
            "languages": {},
            "files": [],
        }

        language_counter = Counter()

        for root, dirs, files in project_path.walk():
            # Prune directories in place to avoid traversing ignored folders
            dirs[:] = [d for d in dirs if not should_ignore_dir(Path(d))]

            summary["total_directories"] += len(dirs)

            for file in files:
                item = root / file
                summary["total_files"] += 1
                relative_path = item.relative_to(project_path)
                filename_lower = item.name.lower()
                extension = item.suffix.lower()

                # Determine language based on special file names or extensions
                if filename_lower in SPECIAL_FILES:
                    language = SPECIAL_FILES[filename_lower]
                else:
                    language = LANGUAGE_MAP.get(extension, "Unknown")

                summary["files"].append(
                    {
                        "path": str(relative_path),
                        "name": item.name,
                        "extension": extension,
                        "language": language,
                        "size": item.stat().st_size,
                    }
                )

                if language != "Unknown":
                    language_counter[language] += 1

        summary["languages"] = dict(language_counter)
        return summary