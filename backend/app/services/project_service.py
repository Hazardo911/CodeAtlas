from pathlib import Path, PurePosixPath
from uuid import uuid4
import shutil

from fastapi import UploadFile

from app.config import WORKSPACE_DIR
from app.utils.helpers import (
    create_directory,
    write_json,
    extract_zip,
    save_upload_file,
    find_project_root,
    copy_folder_contents,
)

from app.services.scanner_service import ScannerService
from app.services.parser_service import ParserService

from app.utils.constants import (
    ProjectStatus,
    ProjectSource,
)


class ProjectService:

    def __init__(self):
        self.scanner_service = ScannerService()
        self.parser_service = ParserService()

    def _initialize_project(
        self,
        project_name: str,
        source_type: str = ProjectSource.ZIP,
    ):
        """Create workspace and metadata."""

        project_id = str(uuid4())

        workspace = WORKSPACE_DIR / project_id
        source = workspace / "source"
        cache = workspace / "cache"
        logs = workspace / "logs"

        create_directory(workspace)
        create_directory(source)
        create_directory(cache)
        create_directory(logs)

        metadata = {
            "project_id": project_id,
            "project_name": project_name,
            "status": ProjectStatus.CREATED,
            "source": source_type,
            "language": None,
        }

        write_json(
            workspace / "metadata.json",
            metadata,
        )

        return {
            "metadata": metadata,
            "workspace": workspace,
            "source": source,
            "cache": cache,
            "logs": logs,
        }

    async def create_from_zip(
        self,
        file: UploadFile,
    ):

        # Validate upload
        if not file.filename:
            raise ValueError("No file uploaded.")

        if not file.filename.lower().endswith(".zip"):
            raise ValueError("Only ZIP files are supported.")

        # Project name
        project_name = Path(file.filename).stem

        # Create workspace
        project = self._initialize_project(
            project_name=project_name,
            source_type=ProjectSource.ZIP,
        )

        workspace = project["workspace"]
        source = project["source"]

        # Save original ZIP
        zip_path = workspace / "original.zip"

        await save_upload_file(
            file,
            zip_path,
        )

        # Temporary extraction folder
        extract_path = workspace / "temp"

        create_directory(extract_path)

        # Extract ZIP
        extract_zip(
            zip_path,
            extract_path,
        )

        # Detect actual project root
        project_root = find_project_root(
            extract_path
        )

        # Move everything into source/
        for item in project_root.iterdir():

            destination = source / item.name

            shutil.move(
                str(item),
                str(destination),
            )

        # Remove temporary folder
        shutil.rmtree(extract_path)

        return project["metadata"]

    async def create_from_files(
        self,
        files: list[UploadFile],
        relative_paths: list[str],
        project_name: str,
    ) -> dict:
        """Ingest browser-selected folder files while preserving their structure."""
        if not files or len(files) != len(relative_paths):
            raise ValueError("Files and relative paths must be provided in matching order.")

        safe_name = Path(project_name).name.strip() or "Local repository"
        project = self._initialize_project(
            project_name=safe_name,
            source_type=ProjectSource.FILES,
        )
        source = project["source"]

        try:
            for upload, raw_path in zip(files, relative_paths):
                normalized = PurePosixPath(raw_path.replace("\\", "/"))
                parts = normalized.parts
                if not parts or normalized.is_absolute() or ".." in parts:
                    raise ValueError(f"Unsafe repository path: {raw_path}")

                # webkitRelativePath normally includes the selected root folder.
                repository_parts = parts[1:] if len(parts) > 1 and parts[0] == safe_name else parts
                if not repository_parts:
                    continue

                destination = source.joinpath(*repository_parts)
                destination.parent.mkdir(parents=True, exist_ok=True)
                await save_upload_file(upload, destination)
        except Exception:
            shutil.rmtree(project["workspace"], ignore_errors=True)
            raise

        return project["metadata"]

    def create_from_folder(self, folder_path: str) -> dict:
        """
        Ingests a project from an absolute local folder path.
        """
        path = Path(folder_path)
        if not path.exists():
            raise FileNotFoundError(f"Local folder path does not exist: {folder_path}")
        if not path.is_dir():
            raise ValueError(f"Path is not a directory: {folder_path}")

        project_name = path.name
        project = self._initialize_project(
            project_name=project_name,
            source_type=ProjectSource.FOLDER,
        )

        source = project["source"]

        # Copy folder contents with ignore logic
        copy_folder_contents(path, source)

        return project["metadata"]

    def create_from_github(self, repo_url: str) -> dict:
        """
        Ingests a project by cloning a public GitHub repository.
        """
        url_clean = repo_url.rstrip("/")
        if url_clean.endswith(".git"):
            url_clean = url_clean[:-4]
        project_name = url_clean.split("/")[-1]

        project = self._initialize_project(
            project_name=project_name,
            source_type=ProjectSource.GITHUB,
        )

        workspace = project["workspace"]
        source = project["source"]

        import subprocess
        temp_dir = workspace / "temp_git"
        create_directory(temp_dir)

        try:
            # Clone repo with shallow depth
            cmd = ["git", "clone", "--depth", "1", repo_url, str(temp_dir)]
            subprocess.run(cmd, capture_output=True, text=True, check=True)
        except subprocess.CalledProcessError as e:
            # Clean up both the temp dir and workspace metadata if git clone fails
            shutil.rmtree(temp_dir, ignore_errors=True)
            shutil.rmtree(workspace, ignore_errors=True)
            raise ValueError(f"Failed to clone GitHub repository: {e.stderr.strip()}")

        try:
            # Remove .git folder
            git_folder = temp_dir / ".git"
            if git_folder.exists():
                shutil.rmtree(git_folder, ignore_errors=True)

            # Copy contents with ignore logic
            copy_folder_contents(temp_dir, source)
        finally:
            # Clean up temp clone
            shutil.rmtree(temp_dir, ignore_errors=True)

        return project["metadata"]

    def scan_project(self, project_id: str) -> dict:
        """
        Orchestrates project scanning and symbol parsing in sequence.

        Args:
            project_id (str): The project identifier.

        Returns:
            dict: The scan results generated by ScannerService.
        """
        # 1. Run the code scanner (generates scan_result.json and health.json)
        scan_data = self.scanner_service.scan_project(project_id)

        # 2. Run the code parser (generates symbols.json)
        self.parser_service.parse_project(project_id)

        return scan_data
