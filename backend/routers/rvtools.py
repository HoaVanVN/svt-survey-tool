from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, List, Optional
from pydantic import BaseModel
from database import get_db
import models
from datetime import datetime

router = APIRouter(prefix="/customers/{customer_id}/rvtools", tags=["rvtools"])


class RVToolsPayload(BaseModel):
    source_filename: Optional[str] = None
    source_files: Optional[List[Any]] = None   # list of {filename, vm_count, imported_at}
    vinfo: List[Any] = []
    vhost: List[Any] = []
    vcluster: List[Any] = []
    vdatastore: List[Any] = []
    vsnapshot: List[Any] = []
    vhealth: List[Any] = []
    vlicense: List[Any] = []
    vdisk: List[Any] = []
    summary: Any = {}


def _check_customer(db, customer_id):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c


@router.get("")
def get_rvtools(customer_id: int, db: Session = Depends(get_db)):
    _check_customer(db, customer_id)
    r = db.query(models.RVToolsData).filter(models.RVToolsData.customer_id == customer_id).first()
    if not r:
        return {"exists": False}
    return {
        "exists": True,
        "source_filename": r.source_filename,
        "source_files": r.source_files or [],
        "imported_at": r.imported_at.isoformat() if r.imported_at else None,
        "vinfo": r.vinfo or [],
        "vhost": r.vhost or [],
        "vcluster": r.vcluster or [],
        "vdatastore": r.vdatastore or [],
        "vsnapshot": r.vsnapshot or [],
        "vhealth": r.vhealth or [],
        "vlicense": r.vlicense or [],
        "vdisk": r.vdisk or [],
        "summary": r.summary or {},
    }


@router.put("")
def save_rvtools(customer_id: int, payload: RVToolsPayload, db: Session = Depends(get_db)):
    _check_customer(db, customer_id)
    r = db.query(models.RVToolsData).filter(models.RVToolsData.customer_id == customer_id).first()
    if not r:
        r = models.RVToolsData(customer_id=customer_id)
        db.add(r)
    r.source_filename = payload.source_filename
    r.source_files = payload.source_files if payload.source_files is not None else (r.source_files or [])
    r.vinfo = payload.vinfo
    r.vhost = payload.vhost
    r.vcluster = payload.vcluster
    r.vdatastore = payload.vdatastore
    r.vsnapshot = payload.vsnapshot
    r.vhealth = payload.vhealth
    r.vlicense = payload.vlicense
    r.vdisk = payload.vdisk
    r.summary = payload.summary
    db.commit()
    db.refresh(r)
    return {
        "ok": True,
        "source_filename": r.source_filename,
        "source_files": r.source_files or [],
        "imported_at": r.imported_at.isoformat() if r.imported_at else None,
        "vm_count": len(r.vinfo or []),
    }


@router.delete("")
def delete_rvtools(customer_id: int, db: Session = Depends(get_db)):
    _check_customer(db, customer_id)
    r = db.query(models.RVToolsData).filter(models.RVToolsData.customer_id == customer_id).first()
    if r:
        db.delete(r)
        db.commit()
    return {"ok": True}
