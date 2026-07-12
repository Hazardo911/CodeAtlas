from pathlib import Path
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
)

from app.utils.constants import (
    ProjectStatus,
    ProjectSource,
)


class ProjectService:

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