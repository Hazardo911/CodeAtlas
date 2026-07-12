from fastapi import FastAPI

from app.database.db import Base, engine
from app.api.project import router as project_router

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI application
app = FastAPI(
    title="CodeAtlas API",
    version="1.0.0"
)

# Register routers
app.include_router(project_router)


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