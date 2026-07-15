from fastapi import APIRouter, HTTPException
from app.ai.ollama_client import get_ollama_client
from app.config import OLLAMA_MODEL

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/ask")
def ask_ai() -> dict:
    raise HTTPException(
        status_code=501,
        detail="Use /projects/{project_id}/chat for project-grounded AI.",
    )


@router.get("/status")
def ai_status() -> dict:
    """Report whether the configured local Ollama runtime is reachable."""
    status = get_ollama_client().get_status(OLLAMA_MODEL)
    return {
        **status,
        "model": OLLAMA_MODEL,
        "provider": "Ollama",
    }
