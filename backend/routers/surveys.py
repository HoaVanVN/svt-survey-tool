from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, sizing

router = APIRouter(prefix="/customers/{customer_id}", tags=["surveys"])


def get_or_404(db, customer_id):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c


# ── Workload Survey ─────────────────────────────────────────────────────────

@router.get("/workload", response_model=schemas.WorkloadSurveyOut)
def get_workload(customer_id: int, db: Session = Depends(get_db)):
    get_or_404(db, customer_id)
    s = db.query(models.WorkloadSurvey).filter(models.WorkloadSurvey.customer_id == customer_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    return s


@router.put("/workload", response_model=schemas.WorkloadSurveyOut)
def upsert_workload(customer_id: int, data: schemas.WorkloadSurveyBase, db: Session = Depends(get_db)):
    get_or_404(db, customer_id)
    s = db.query(models.WorkloadSurvey).filter(models.WorkloadSurvey.customer_id == customer_id).first()
    items_data = data.workload_items or []

    if not s:
        s = models.WorkloadSurvey(customer_id=customer_id)
        db.add(s)

    for k, v in data.model_dump(exclude={"workload_items"}, exclude_unset=True).items():
        setattr(s, k, v)

    db.flush()

    db.query(models.WorkloadItem).filter(models.WorkloadItem.survey_id == s.id).delete()
    for i, item in enumerate(items_data):
        wi = models.WorkloadItem(survey_id=s.id, order_no=i + 1, **item.model_dump())
        db.add(wi)

    db.commit()
    db.refresh(s)
    return s


@router.get("/workload/sizing")
def get_compute_sizing(customer_id: int, db: Session = Depends(get_db)):
    get_or_404(db, customer_id)
    s = db.query(models.WorkloadSurvey).filter(models.WorkloadSurvey.customer_id == customer_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Workload survey not found")
    items = db.query(models.WorkloadItem).filter(models.WorkloadItem.survey_id == s.id).all()
    compute = sizing.calc_compute_sizing(s, items)
    storage = sizing.calc_storage_sizing(s, items)
    return {"compute": compute, "storage": storage}


# ── Network Survey ───────────────────────────────────────────────────────────

@router.get("/network", response_model=schemas.NetworkSurveyOut)
def get_network(customer_id: int, db: Session = Depends(get_db)):
    get_or_404(db, customer_id)
    s = db.query(models.NetworkSurvey).filter(models.NetworkSurvey.customer_id == customer_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    return s


@router.put("/network", response_model=schemas.NetworkSurveyOut)
def upsert_network(customer_id: int, data: schemas.NetworkSurveyBase, db: Session = Depends(get_db)):
    get_or_404(db, customer_id)
    s = db.query(models.NetworkSurvey).filter(models.NetworkSurvey.customer_id == customer_id).first()
    if not s:
        s = models.NetworkSurvey(customer_id=customer_id)
        db.add(s)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


# ── Backup Survey ────────────────────────────────────────────────────────────

@router.get("/backup", response_model=schemas.BackupSurveyOut)
def get_backup(customer_id: int, db: Session = Depends(get_db)):
    get_or_404(db, customer_id)
    s = db.query(models.BackupSurvey).filter(models.BackupSurvey.customer_id == customer_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    return s


@router.put("/backup", response_model=schemas.BackupSurveyOut)
def upsert_backup(customer_id: int, data: schemas.BackupSurveyBase, db: Session = Depends(get_db)):
    get_or_404(db, customer_id)
    s = db.query(models.BackupSurvey).filter(models.BackupSurvey.customer_id == customer_id).first()
    sources_data = data.backup_sources or []

    if not s:
        s = models.BackupSurvey(customer_id=customer_id)
        db.add(s)

    for k, v in data.model_dump(exclude={"backup_sources"}, exclude_unset=True).items():
        setattr(s, k, v)

    db.flush()
    db.query(models.BackupSource).filter(models.BackupSource.survey_id == s.id).delete()
    for i, src in enumerate(sources_data):
        bs = models.BackupSource(survey_id=s.id, order_no=i + 1, **src.model_dump())
        db.add(bs)

    db.commit()
    db.refresh(s)
    return s


@router.get("/backup/sizing")
def get_backup_sizing(customer_id: int, db: Session = Depends(get_db)):
    get_or_404(db, customer_id)
    s = db.query(models.BackupSurvey).filter(models.BackupSurvey.customer_id == customer_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Backup survey not found")
    sources = db.query(models.BackupSource).filter(models.BackupSource.survey_id == s.id).all()
    return sizing.calc_backup_sizing(s, sources)


# ── Physical Inventory ────────────────────────────────────────────────────────

@router.get("/inventory", response_model=schemas.PhysicalInventoryOut)
def get_inventory(customer_id: int, db: Session = Depends(get_db)):
    get_or_404(db, customer_id)
    s = db.query(models.PhysicalInventory).filter(models.PhysicalInventory.customer_id == customer_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    return s


@router.put("/inventory", response_model=schemas.PhysicalInventoryOut)
def upsert_inventory(customer_id: int, data: schemas.PhysicalInventoryBase, db: Session = Depends(get_db)):
    get_or_404(db, customer_id)
    s = db.query(models.PhysicalInventory).filter(models.PhysicalInventory.customer_id == customer_id).first()
    if not s:
        s = models.PhysicalInventory(customer_id=customer_id)
        db.add(s)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


# ── Security Survey ────────────────────────────────────────────────────────────

@router.get("/security", response_model=schemas.SecuritySurveyOut)
def get_security(customer_id: int, db: Session = Depends(get_db)):
    get_or_404(db, customer_id)
    s = db.query(models.SecuritySurvey).filter(models.SecuritySurvey.customer_id == customer_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    return s


@router.put("/security", response_model=schemas.SecuritySurveyOut)
def upsert_security(customer_id: int, data: schemas.SecuritySurveyBase, db: Session = Depends(get_db)):
    get_or_404(db, customer_id)
    s = db.query(models.SecuritySurvey).filter(models.SecuritySurvey.customer_id == customer_id).first()
    if not s:
        s = models.SecuritySurvey(customer_id=customer_id)
        db.add(s)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


# ── OCP Survey ────────────────────────────────────────────────────────────────

@router.get("/ocp", response_model=schemas.OCPSurveyOut)
def get_ocp(customer_id: int, db: Session = Depends(get_db)):
    get_or_404(db, customer_id)
    s = db.query(models.OCPSurvey).filter(models.OCPSurvey.customer_id == customer_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    return s


@router.put("/ocp", response_model=schemas.OCPSurveyOut)
def upsert_ocp(customer_id: int, data: schemas.OCPSurveyBase, db: Session = Depends(get_db)):
    get_or_404(db, customer_id)
    s = db.query(models.OCPSurvey).filter(models.OCPSurvey.customer_id == customer_id).first()
    if not s:
        s = models.OCPSurvey(customer_id=customer_id)
        db.add(s)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.get("/ocp/sizing")
def get_ocp_sizing(customer_id: int, db: Session = Depends(get_db)):
    get_or_404(db, customer_id)
    s = db.query(models.OCPSurvey).filter(models.OCPSurvey.customer_id == customer_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="OCP survey not found")
    return sizing.calc_ocp_sizing(s)
