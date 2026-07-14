from fastapi import APIRouter

router = APIRouter(prefix="/graph", tags=["graph"])

@router.get("")
def get_graph() -> dict:
    return {"nodes": [], "edges": []}
