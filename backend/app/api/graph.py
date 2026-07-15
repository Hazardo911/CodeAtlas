from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/graph", tags=["graph"])

@router.get("")
def get_graph() -> dict:
    raise HTTPException(
        status_code=501,
        detail="Dependency graph generation is not implemented yet.",
    )
