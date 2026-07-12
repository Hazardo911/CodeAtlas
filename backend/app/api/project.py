from fastapi import APIRouter
from fastapi import UploadFile
from fastapi import File
from app.services.scanner_service import ScannerService
from app.services.project_service import ProjectService
from app.services.architecture_service import ArchitectureService

architecture_service = ArchitectureService()

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)

service = ProjectService()
scanner_service = ScannerService()

@router.post("/upload")
async def upload_project(
    file: UploadFile = File(...)
):
    return await service.create_from_zip(file)


@router.post("/{project_id}/scan")
def scan_project(
    project_id: str,
):
    return scanner_service.scan_project(
        project_id
    )

@router.post("/{project_id}/architecture")
def detect_architecture(
    project_id: str,
):

    return architecture_service.analyze(
        project_id
    )