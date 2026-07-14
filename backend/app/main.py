from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.db import Base, engine
from app.api.project import router as project_router
from app.api.ai import router as ai_router
from app.api.graph import router as graph_router

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI application
app = FastAPI(
    title="CodeAtlas API",
    version="1.0.0"
)

# The API and Vite UI are separate local processes during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(project_router)
app.include_router(ai_router)
app.include_router(graph_router)



@app.get("/")
def home():
    return {
        "message": "Welcome to CodeAtlas 🚀"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
