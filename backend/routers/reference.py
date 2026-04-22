from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from database import get_db
import models

router = APIRouter(prefix="/reference", tags=["reference"])

DEFAULT_REFS = {
    "os_list": [
        "Windows Server 2008 (EOL)", "Windows Server 2008 R2 (EOL)",
        "Windows Server 2012 (EOL)", "Windows Server 2012 R2 (EOL)",
        "Windows Server 2016", "Windows Server 2019", "Windows Server 2022", "Windows Server 2025",
        "RHEL 6 (EOL)", "RHEL 7 (EOL)", "RHEL 8", "RHEL 9",
        "Oracle Linux 6 (EOL)", "Oracle Linux 7 (EOL)", "Oracle Linux 8", "Oracle Linux 9",
        "Ubuntu 16.04 LTS (EOL)", "Ubuntu 18.04 LTS (EOL)",
        "Ubuntu 20.04 LTS", "Ubuntu 22.04 LTS", "Ubuntu 24.04 LTS",
        "CentOS 6 (EOL)", "CentOS 7 (EOL)", "CentOS 8 (EOL)",
        "Debian 10", "Debian 11", "Debian 12",
        "VMware Photon OS 3", "VMware Photon OS 4", "VMware Photon OS 5",
        "Other",
    ],
    "vendors": [
        "HPE", "Dell", "Fujitsu", "Oracle", "Supermicro", "Nutanix",
        "Cisco", "Juniper", "Aruba", "Ruckus", "Ubiquiti",
        "Palo Alto Networks", "Fortinet", "Check Point", "F5",
        "NetApp", "Pure Storage", "Hitachi Vantara", "IBM",
        "Lenovo", "Huawei", "Brocade", "Other",
    ],
    "hypervisors": [
        "VMware vSphere 6.0 (EOL)", "VMware vSphere 6.5 (EOL)", "VMware vSphere 6.7 (EOL)",
        "VMware vSphere 7.0", "VMware vSphere 8.0",
        "Microsoft Hyper-V 2012 (EOL)", "Microsoft Hyper-V 2016",
        "Microsoft Hyper-V 2019", "Microsoft Hyper-V 2022",
        "Proxmox VE 7", "Proxmox VE 8",
        "Nutanix AHV", "KVM", "Xen", "Other",
    ],
    "server_types": ["Bare Metal", "Virtual Machine"],
    "storage_types": ["All-Flash", "Hybrid", "HDD", "NVMe", "NAS", "SAN", "Other"],
    "network_device_types": ["Switch", "Router", "Firewall", "Load Balancer", "WAF", "IPS/IDS", "Other"],
    "wifi_bands": ["2.4GHz", "5GHz", "6GHz", "Dual-band", "Tri-band"],
    "app_types": ["Web App", "Database", "ERP", "CRM", "Email", "File Server",
                  "Middleware", "Security", "Monitoring", "Other"],
    "criticality_levels": ["Critical", "High", "Medium", "Low"],
    "environments": ["Production", "Staging", "Development", "Test", "DR"],
    "device_statuses": ["Using", "Standby", "EOL", "Decommissioned", "Phased-out"],
    "san_speeds": ["4G", "8G", "16G", "32G", "64G", "Other"],
}

REF_LABELS = {
    "os_list": "OS / Operating Systems",
    "vendors": "Vendors / Hãng sản xuất",
    "hypervisors": "Hypervisors",
    "server_types": "Server Types",
    "storage_types": "Storage Types",
    "network_device_types": "Network Device Types",
    "wifi_bands": "WiFi Bands",
    "app_types": "Application Types",
    "criticality_levels": "Criticality Levels",
    "environments": "Environments",
    "device_statuses": "Device Statuses",
    "san_speeds": "SAN Speeds",
}


class RefPayload(BaseModel):
    items: List[str] = []


@router.get("/all")
def get_all_refs(db: Session = Depends(get_db)):
    result = {k: list(v) for k, v in DEFAULT_REFS.items()}
    rows = db.query(models.ReferenceData).all()
    for row in rows:
        result[row.ref_type] = row.items
    result["_labels"] = REF_LABELS
    return result


@router.get("/{ref_type}")
def get_ref(ref_type: str, db: Session = Depends(get_db)):
    row = db.query(models.ReferenceData).filter(models.ReferenceData.ref_type == ref_type).first()
    items = row.items if row else DEFAULT_REFS.get(ref_type, [])
    return {"ref_type": ref_type, "items": items}


@router.put("/{ref_type}")
def save_ref(ref_type: str, payload: RefPayload, db: Session = Depends(get_db)):
    row = db.query(models.ReferenceData).filter(models.ReferenceData.ref_type == ref_type).first()
    if not row:
        row = models.ReferenceData(ref_type=ref_type, items=payload.items)
        db.add(row)
    else:
        row.items = payload.items
    db.commit()
    db.refresh(row)
    return {"ref_type": ref_type, "items": row.items}


@router.delete("/{ref_type}")
def reset_ref(ref_type: str, db: Session = Depends(get_db)):
    row = db.query(models.ReferenceData).filter(models.ReferenceData.ref_type == ref_type).first()
    if row:
        db.delete(row)
        db.commit()
    return {"ref_type": ref_type, "items": DEFAULT_REFS.get(ref_type, [])}
