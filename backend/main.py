from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from database import engine, Base
import models
from routers import customers, surveys, export

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SVT Survey Tool", version="1.0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router, prefix="/api")
app.include_router(surveys.router, prefix="/api")
app.include_router(export.router, prefix="/api")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index):
            return FileResponse(index)
        return {"message": "SVT Survey Tool API", "docs": "/docs"}

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.1"}

@app.get("/api/security-questions")
def get_questions():
    from schemas import SECURITY_QUESTIONS
    return SECURITY_QUESTIONS
