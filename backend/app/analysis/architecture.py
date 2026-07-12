from pathlib import Path


class ArchitectureDetector:

    def analyze(self, scan_result: dict):

        files = scan_result["files"]

        paths = {
            file["path"].replace("\\", "/").lower()
            for file in files
        }

        names = {
            Path(file["path"]).name.lower()
            for file in files
        }

        architecture = {

            "backend": False,
            "frontend": False,
            "database": False,
            "api": False,
            "ai": False,
            "testing": False,
            "docker": False,
            "github_actions": False,

            "frameworks": []
        }

        # ----------------------------
        # Folder detection
        # ----------------------------

        if any(path.startswith("backend/") for path in paths):
            architecture["backend"] = True

        if any(path.startswith("frontend/") for path in paths):
            architecture["frontend"] = True

        if any(path.startswith("database/") for path in paths):
            architecture["database"] = True

        if any(path.startswith("rag/") for path in paths):
            architecture["ai"] = True

        if any(path.startswith("agent/") for path in paths):
            architecture["ai"] = True

        if any(path.startswith("tests/") for path in paths):
            architecture["testing"] = True

        # ----------------------------
        # File detection
        # ----------------------------

        if "dockerfile" in names:
            architecture["docker"] = True

        if any(".github/workflows/" in path for path in paths):
            architecture["github_actions"] = True

        if any("/api.py" in path or path.endswith("api.py") for path in paths):
            architecture["api"] = True

        # ----------------------------
        # Framework detection
        # ----------------------------

        if "requirements.txt" in names:
            architecture["frameworks"].append("Python")

        if "package.json" in names:
            architecture["frameworks"].append("Node.js")

        return architecture