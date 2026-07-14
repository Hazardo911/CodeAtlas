from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from pathlib import Path
from functools import lru_cache
from app.services.project_service import ProjectService
from app.services.architecture_service import ArchitectureService

architecture_service = ArchitectureService()

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)

service = ProjectService()
@lru_cache(maxsize=1)
def get_chat_service():
    """Load the heavy embedding/RAG stack only when chat is first used."""
    from app.services.chat_service import ChatService
    return ChatService()

class FolderUploadRequest(BaseModel):
    folder_path: str


class GithubUploadRequest(BaseModel):
    repo_url: str


@router.post("/upload")
async def upload_project(
    file: UploadFile = File(...)
):
    try:
        return await service.create_from_zip(file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


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
    try:
        return service.create_from_github(request.repo_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{project_id}/scan")
def scan_project(
    project_id: str,
):
    try:
        return service.scan_project(project_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{project_id}/architecture")
def detect_architecture(
    project_id: str,
):
    try:
        return architecture_service.analyze(project_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


class ChatRequest(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
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
    return get_chat_service().answer_question(
        project_id=project_id,
        query=request.query,
        model=request.model
    )
