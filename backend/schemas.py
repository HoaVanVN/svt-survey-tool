from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class CustomerBase(BaseModel):
    name: str
    project_name: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    presales: Optional[str] = None
    survey_date: Optional[str] = None
    notes: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    name: Optional[str] = None


class CustomerOut(CustomerBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkloadItemBase(BaseModel):
    order_no: Optional[int] = None
    name: Optional[str] = None
    workload_type: Optional[str] = None
    vm_count: Optional[int] = 1
    vcpu_per_vm: Optional[float] = 4
    ram_gb_per_vm: Optional[float] = 16
    disk_os_gb_per_vm: Optional[float] = 100
    disk_data_gb_per_vm: Optional[float] = 500
    iops_per_vm: Optional[float] = 0
    throughput_mbps_per_vm: Optional[float] = 0
    os_type: Optional[str] = None
    tier: Optional[str] = "Tier 2"
    notes: Optional[str] = None


class WorkloadItemOut(WorkloadItemBase):
    id: int

    class Config:
        from_attributes = True


class WorkloadSurveyBase(BaseModel):
    env_type: Optional[str] = "Production"
    virt_platform: Optional[str] = "VMware"
    current_system: Optional[str] = "On-premise"
    ha_required: Optional[bool] = True
    cluster_nodes: Optional[int] = 3
    growth_years: Optional[int] = 3
    growth_rate: Optional[float] = 20.0
    virt_ratio: Optional[float] = 4.0
    cpu_overhead_pct: Optional[float] = 10.0
    ram_overhead_pct: Optional[float] = 10.0
    ha_reserve_pct: Optional[float] = 25.0
    storage_snapshot_pct: Optional[float] = 20.0
    storage_syslog_pct: Optional[float] = 15.0
    dedup_ratio: Optional[float] = 2.0
    cpu_sockets: Optional[int] = 2
    cores_per_socket: Optional[int] = 16
    ram_per_server_gb: Optional[int] = 512
    workload_items: Optional[List[WorkloadItemBase]] = []


class WorkloadSurveyOut(WorkloadSurveyBase):
    id: int
    customer_id: int
    workload_items: List[WorkloadItemOut] = []

    class Config:
        from_attributes = True


class NetworkSurveyBase(BaseModel):
    site_count: Optional[int] = 1
    deployment_model: Optional[str] = "Single-site"
    site_distance_km: Optional[float] = None
    wan_bandwidth_gbps: Optional[float] = None
    wan_latency_ms: Optional[float] = None
    server_uplink_speed: Optional[str] = "25GbE"
    uplink_count_per_server: Optional[int] = 2
    tor_switch_status: Optional[str] = "New"
    sdn_nsx_required: Optional[bool] = False
    rdma_roce_required: Optional[bool] = False
    storage_conn_type: Optional[str] = "FC 16G"
    hba_nic_per_server: Optional[int] = 2
    fabric_switch_existing: Optional[bool] = False
    fc_ports_total: Optional[int] = None
    multipath_required: Optional[bool] = True
    power_kw_per_rack: Optional[float] = None
    rack_count: Optional[int] = None
    redundant_power: Optional[bool] = True
    cooling_type: Optional[str] = "Air"
    compliance_requirements: Optional[str] = None
    encryption_at_rest: Optional[bool] = False
    encryption_in_transit: Optional[bool] = False
    air_gap_required: Optional[bool] = False


class NetworkSurveyOut(NetworkSurveyBase):
    id: int
    customer_id: int

    class Config:
        from_attributes = True


class BackupSourceBase(BaseModel):
    order_no: Optional[int] = None
    name: Optional[str] = None
    data_type: Optional[str] = None
    size_tb: Optional[float] = 0
    growth_rate_pct: Optional[float] = 10
    backup_frequency: Optional[str] = "Daily"
    retention_days: Optional[int] = 30
    tier: Optional[str] = "Tier 2"


class BackupSourceOut(BackupSourceBase):
    id: int

    class Config:
        from_attributes = True


class BackupSurveyBase(BaseModel):
    backup_software: Optional[str] = None
    backup_target: Optional[str] = None
    air_gap_immutable: Optional[bool] = False
    offsite_cloud: Optional[bool] = False
    cloud_target: Optional[str] = None
    tape_required: Optional[bool] = False
    tier1_rpo: Optional[str] = "15 phút"
    tier1_rto: Optional[str] = "1 giờ"
    tier2_rpo: Optional[str] = "4 giờ"
    tier2_rto: Optional[str] = "4 giờ"
    tier3_rpo: Optional[str] = "24 giờ"
    tier3_rto: Optional[str] = "8 giờ"
    tier4_rpo: Optional[str] = "24 giờ"
    tier4_rto: Optional[str] = "72 giờ"
    change_rate_pct: Optional[float] = 5.0
    dedup_ratio: Optional[float] = 3.0
    full_retention_count: Optional[int] = 4
    incremental_per_day: Optional[int] = 1
    incremental_retention_days: Optional[int] = 30
    copy_offsite: Optional[bool] = False
    offsite_retention_days: Optional[int] = 90
    repo_overhead_pct: Optional[float] = 20.0
    backup_sources: Optional[List[BackupSourceBase]] = []


class BackupSurveyOut(BackupSurveyBase):
    id: int
    customer_id: int
    backup_sources: List[BackupSourceOut] = []

    class Config:
        from_attributes = True


class PhysicalInventoryBase(BaseModel):
    servers: Optional[List[Any]] = []
    san_switches: Optional[List[Any]] = []
    storage_systems: Optional[List[Any]] = []
    network_devices: Optional[List[Any]] = []
    wifi_aps: Optional[List[Any]] = []


class PhysicalInventoryOut(PhysicalInventoryBase):
    id: int
    customer_id: int

    class Config:
        from_attributes = True


SECURITY_QUESTIONS = [
    {"id": 1, "topic": "Bảo mật", "question": "Các biện pháp bảo mật hiện tại của bạn là gì?"},
    {"id": 2, "topic": "Bảo mật", "question": "Tổ chức của bạn có đang tuân theo chiến lược bảo mật nào không?"},
    {"id": 3, "topic": "Bảo mật", "question": "Bạn vận hành khối lượng công việc của mình một cách an toàn như thế nào?"},
    {"id": 4, "topic": "Bảo mật", "question": "Những khối lượng công việc nào cần được bảo vệ và hiện tại được khai thác qua những phương thức nào (HTTPS, VPN)?"},
    {"id": 5, "topic": "Bảo mật", "question": "Bạn đã từng gặp sự cố bảo mật hoặc cố gắng xâm nhập nào trong quá khứ chưa?"},
    {"id": 6, "topic": "Firewall", "question": "Có tường lửa lớp 4 hoặc lớp 7 nào được sử dụng tại chỗ không?"},
    {"id": 7, "topic": "Firewall", "question": "Bạn đang bảo vệ ứng dụng của mình hiện tại như thế nào? (WAF, bot protection)"},
    {"id": 8, "topic": "Tấn công", "question": "Có chiến lược nào để ngăn chặn các cuộc tấn công như DDOS, XSS không?"},
    {"id": 9, "topic": "Giám sát", "question": "Bạn phát hiện và điều tra các sự kiện bảo mật như thế nào?"},
    {"id": 10, "topic": "Giám sát", "question": "Bạn phát hiện, liên kết và phản hồi các vi phạm bảo mật trên môi trường hiện tại như thế nào?"},
    {"id": 11, "topic": "Kiểm thử", "question": "Thông tin chi tiết về việc kiểm thử thâm nhập (Penetration Testing)?"},
    {"id": 12, "topic": "Mã hóa", "question": "Bạn có đang sử dụng dịch vụ quản lý khóa nào để mã hóa không? KMS là gì?"},
    {"id": 13, "topic": "Công cụ", "question": "Thông tin về các công cụ bảo mật của bên thứ ba?"},
    {"id": 14, "topic": "Tuân thủ", "question": "Bạn có thực hiện kiểm tra bên ngoài để đáp ứng các yêu cầu tuân thủ không?"},
    {"id": 15, "topic": "Tuân thủ", "question": "Các yêu cầu tuân thủ nào cần phải đáp ứng? (HIPAA, GDPR, PCI, ISO27001)"},
    {"id": 16, "topic": "Định danh", "question": "Quy trình hiện tại để quản lý quyền lợi và cấp quyền truy cập người dùng mới?"},
    {"id": 17, "topic": "Định danh", "question": "Người dùng được cung cấp, xác thực và ủy quyền như thế nào?"},
    {"id": 18, "topic": "Định danh", "question": "Bạn đang sử dụng IdP nào? (Active Directory, Azure AD, Okta, Ping Identity)"},
    {"id": 19, "topic": "Định danh", "question": "Quy trình hiện tại để ngừng sử dụng đối với nhân viên cũ là gì?"},
    {"id": 20, "topic": "Zero Trust", "question": "Bạn có sáng kiến 'zero trust' nào không? Các kết quả ưu tiên cao mong muốn đạt được?"},
]


class SecuritySurveyBase(BaseModel):
    responses: Optional[dict] = {}


class SecuritySurveyOut(SecuritySurveyBase):
    id: int
    customer_id: int

    class Config:
        from_attributes = True


class OCPSurveyBase(BaseModel):
    cluster_name: Optional[str] = "Production"
    ocp_version: Optional[str] = "4.18"
    infra_platform: Optional[str] = "Bare Metal"
    deployment_topology: Optional[str] = "Standard"
    network_plugin: Optional[str] = "OVN-Kubernetes"
    ocp_virt_enabled: Optional[bool] = False
    odf_enabled: Optional[bool] = False
    growth_rate_pct: Optional[float] = 20.0
    sizing_years: Optional[int] = 3
    master_count: Optional[int] = 3
    master_vcpu: Optional[int] = 8
    master_ram_gib: Optional[int] = 32
    master_disk_gb: Optional[int] = 1024
    worker_count: Optional[int] = 8
    worker_vcpu: Optional[int] = 32
    worker_ram_gib: Optional[int] = 128
    infra_count: Optional[int] = 3
    infra_vcpu: Optional[int] = 4
    infra_ram_gib: Optional[int] = 16
    infra_disk_gb: Optional[int] = 500
    odf_node_count: Optional[int] = 3
    odf_vcpu: Optional[int] = 16
    odf_ram_gib: Optional[int] = 64
    odf_disk_gb: Optional[int] = 2048
    pod_namespaces: Optional[List[Any]] = []


class OCPSurveyOut(OCPSurveyBase):
    id: int
    customer_id: int

    class Config:
        from_attributes = True
