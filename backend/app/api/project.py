from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
from app.services.scanner_service import ScannerService
from app.services.project_service import ProjectService
from app.services.architecture_service import ArchitectureService
from app.services.chat_service import ChatService

architecture_service = ArchitectureService()
chat_service = ChatService()

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)

service = ProjectService()
scanner_service = ScannerService()

class FolderUploadRequest(BaseModel):
    folder_path: str


class GithubUploadRequest(BaseModel):
    repo_url: str


@router.post("/upload")
async def upload_project(
    file: UploadFile = File(...)
):
    return await service.create_from_zip(file)


@router.post("/upload-files")
async def upload_project_files(
    files: list[UploadFile] = File(...),
    relative_paths: list[str] = Form(...),
    project_name: str = Form(...),
):
    try:
        return await service.create_from_files(files, relative_paths, project_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload-folder")
def upload_project_folder(request: FolderUploadRequest):
    try:
        normalized = Path(request.folder_path)
        return service.create_from_folder(str(normalized))
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload-github")
def upload_project_github(request: GithubUploadRequest):
    return service.create_from_github(request.repo_url)


@router.post("/{project_id}/scan")
def scan_project(
    project_id: str,
):
    return service.scan_project(
        project_id
    )

@router.post("/{project_id}/architecture")
def detect_architecture(
    project_id: str,
):

    return architecture_service.analyze(
        project_id
    )


class ChatRequest(BaseModel):
    query: str
    model: Optional[str] = None


@router.post("/{project_id}/chat")
def chat_with_project(
    project_id: str,
    request: ChatRequest
):
    """
    RAG chat endpoint. Conserves knowledge base context to answer user queries
    locally using the Ollama service.
    """
    return chat_service.answer_question(
        project_id=project_id,
        query=request.query,
        model=request.model
    )
