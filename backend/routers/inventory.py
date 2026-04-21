from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, List
from pydantic import BaseModel
from database import get_db
import models

router = APIRouter(prefix="/customers/{customer_id}/inventory", tags=["inventory"])

CATEGORIES = ["servers", "san_switches", "storage_systems", "network_devices", "wifi_aps"]


def _get_or_create_inv(db, customer_id):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    inv = db.query(models.PhysicalInventory).filter(models.PhysicalInventory.customer_id == customer_id).first()
    if not inv:
        inv = models.PhysicalInventory(customer_id=customer_id,
                                       servers=[], san_switches=[], storage_systems=[],
                                       network_devices=[], wifi_aps=[])
        db.add(inv)
        db.commit()
        db.refresh(inv)
    return inv


def _get_or_create_app(db, customer_id):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    app_inv = db.query(models.ApplicationInventory).filter(models.ApplicationInventory.customer_id == customer_id).first()
    if not app_inv:
        app_inv = models.ApplicationInventory(customer_id=customer_id, applications=[])
        db.add(app_inv)
        db.commit()
        db.refresh(app_inv)
    return app_inv


class CategoryPayload(BaseModel):
    items: List[Any] = []


class AppPayload(BaseModel):
    applications: List[Any] = []


# ── Specific routes FIRST (before parameterized /{category}) ─────────────────

@router.get("/summary/all")
def get_all_inventory(customer_id: int, db: Session = Depends(get_db)):
    inv = _get_or_create_inv(db, customer_id)
    app_inv = _get_or_create_app(db, customer_id)
    return {
        "servers": inv.servers or [],
        "san_switches": inv.san_switches or [],
        "storage_systems": inv.storage_systems or [],
        "network_devices": inv.network_devices or [],
        "wifi_aps": inv.wifi_aps or [],
        "applications": app_inv.applications or [],
    }


@router.get("/applications/list")
def get_applications(customer_id: int, db: Session = Depends(get_db)):
    app_inv = _get_or_create_app(db, customer_id)
    return {"applications": app_inv.applications or []}


@router.put("/applications/list")
def save_applications(customer_id: int, payload: AppPayload, db: Session = Depends(get_db)):
    app_inv = _get_or_create_app(db, customer_id)
    app_inv.applications = payload.applications
    db.commit()
    db.refresh(app_inv)
    return {"applications": app_inv.applications}


# ── Parameterized category routes AFTER specific ones ────────────────────────

@router.get("/{category}")
def get_category(customer_id: int, category: str, db: Session = Depends(get_db)):
    if category not in CATEGORIES:
        raise HTTPException(status_code=404, detail="Unknown category")
    inv = _get_or_create_inv(db, customer_id)
    return {"category": category, "items": getattr(inv, category) or []}


@router.put("/{category}")
def save_category(customer_id: int, category: str, payload: CategoryPayload, db: Session = Depends(get_db)):
    if category not in CATEGORIES:
        raise HTTPException(status_code=404, detail="Unknown category")
    inv = _get_or_create_inv(db, customer_id)
    setattr(inv, category, payload.items)
    db.commit()
    db.refresh(inv)
    return {"category": category, "items": getattr(inv, category)}
