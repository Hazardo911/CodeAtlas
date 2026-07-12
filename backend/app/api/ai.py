from fastapi import APIRouter

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/ask")
def ask_ai() -> dict:
    return {"answer": "AI endpoint ready"}
