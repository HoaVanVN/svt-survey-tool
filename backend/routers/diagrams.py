import base64
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
import models

router = APIRouter(prefix="/customers/{customer_id}/diagrams", tags=["diagrams"])

MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB per image
ALLOWED_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"}


def _get_customer(db, customer_id):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c


@router.get("")
def list_diagrams(customer_id: int, db: Session = Depends(get_db)):
    _get_customer(db, customer_id)
    rows = (
        db.query(
            models.CustomerDiagram.id,
            models.CustomerDiagram.filename,
            models.CustomerDiagram.label,
            models.CustomerDiagram.content_type,
            models.CustomerDiagram.uploaded_at,
        )
        .filter(models.CustomerDiagram.customer_id == customer_id)
        .order_by(models.CustomerDiagram.uploaded_at.asc())
        .all()
    )
    return [
        {
            "id": r.id,
            "filename": r.filename,
            "label": r.label or "",
            "content_type": r.content_type,
            "uploaded_at": r.uploaded_at.isoformat() if r.uploaded_at else None,
        }
        for r in rows
    ]


@router.get("/{diagram_id}/data")
def get_diagram_data(customer_id: int, diagram_id: int, db: Session = Depends(get_db)):
    _get_customer(db, customer_id)
    d = db.query(models.CustomerDiagram).filter(
        models.CustomerDiagram.id == diagram_id,
        models.CustomerDiagram.customer_id == customer_id,
    ).first()
    if not d:
        raise HTTPException(status_code=404, detail="Diagram not found")
    return {"id": d.id, "filename": d.filename, "label": d.label or "", "content_type": d.content_type, "data": d.data}


@router.post("")
async def upload_diagram(
    customer_id: int,
    file: UploadFile = File(...),
    label: Optional[str] = Form(""),
    db: Session = Depends(get_db),
):
    _get_customer(db, customer_id)
    content_type = file.content_type or "image/png"
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {content_type}")
    raw = await file.read()
    if len(raw) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 10 MB limit")
    b64 = base64.b64encode(raw).decode("utf-8")
    d = models.CustomerDiagram(
        customer_id=customer_id,
        filename=file.filename or "diagram.png",
        label=label or "",
        content_type=content_type,
        data=b64,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return {"id": d.id, "filename": d.filename, "label": d.label, "content_type": d.content_type, "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None}


class LabelUpdate(BaseModel):
    label: str = ""


@router.put("/{diagram_id}/label")
def update_label(customer_id: int, diagram_id: int, body: LabelUpdate, db: Session = Depends(get_db)):
    _get_customer(db, customer_id)
    d = db.query(models.CustomerDiagram).filter(
        models.CustomerDiagram.id == diagram_id,
        models.CustomerDiagram.customer_id == customer_id,
    ).first()
    if not d:
        raise HTTPException(status_code=404, detail="Diagram not found")
    d.label = body.label
    db.commit()
    return {"ok": True}


@router.delete("/{diagram_id}")
def delete_diagram(customer_id: int, diagram_id: int, db: Session = Depends(get_db)):
    _get_customer(db, customer_id)
    d = db.query(models.CustomerDiagram).filter(
        models.CustomerDiagram.id == diagram_id,
        models.CustomerDiagram.customer_id == customer_id,
    ).first()
    if not d:
        raise HTTPException(status_code=404, detail="Diagram not found")
    db.delete(d)
    db.commit()
    return {"ok": True}
