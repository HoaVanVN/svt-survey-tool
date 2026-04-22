from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
import os

from database import engine, Base
import models
from routers import customers, surveys, export
from routers.inventory import router as inventory_router
from routers.export_pdf import router as export_pdf_router
from routers.reference import router as reference_router
from routers.rvtools import router as rvtools_router

Base.metadata.create_all(bind=engine)

# SQLite column migrations for new columns added after initial schema
def _run_migrations():
    from sqlalchemy import text
    migrations = [
        "ALTER TABLE physical_inventories ADD COLUMN virtual_machines TEXT DEFAULT '[]'",
        "ALTER TABLE ocp_surveys ADD COLUMN virt_workloads TEXT DEFAULT '[]'",
        "ALTER TABLE reference_data ADD COLUMN updated_at DATETIME",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # Column already exists

_run_migrations()

app = FastAPI(title="SVT Survey Tool", version="2.1.3")

# Trust X-Forwarded-For / X-Forwarded-Proto headers from Nginx Proxy Manager
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    # allow_credentials must be False when allow_origins=["*"]
    # (browsers reject credentials + wildcard origin over HTTPS)
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes must be registered BEFORE catch-all SPA handler
app.include_router(customers.router, prefix="/api")
app.include_router(surveys.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(inventory_router, prefix="/api")
app.include_router(export_pdf_router, prefix="/api")
app.include_router(reference_router, prefix="/api")
app.include_router(rvtools_router, prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.1.3"}

@app.get("/api/security-questions")
def get_questions():
    from schemas import SECURITY_QUESTIONS
    return SECURITY_QUESTIONS

# SPA catch-all — must be registered AFTER all /api/* routes
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index):
            return FileResponse(index)
        return {"message": "SVT Survey Tool API", "docs": "/docs"}
