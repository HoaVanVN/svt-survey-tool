from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    project_name = Column(String(255))
    contact = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    presales = Column(String(255))
    survey_date = Column(String(50))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    workload_survey = relationship("WorkloadSurvey", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    network_survey = relationship("NetworkSurvey", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    backup_survey = relationship("BackupSurvey", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    physical_inventory = relationship("PhysicalInventory", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    application_inventory = relationship("ApplicationInventory", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    security_survey = relationship("SecuritySurvey", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    ocp_survey = relationship("OCPSurvey", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    rvtools_data = relationship("RVToolsData", back_populates="customer", uselist=False, cascade="all, delete-orphan")


class WorkloadSurvey(Base):
    __tablename__ = "workload_surveys"
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), unique=True)

    # Part A – Environment
    env_type = Column(String(50), default="Production")
    virt_platform = Column(String(100), default="VMware")
    current_system = Column(String(100), default="On-premise")
    ha_required = Column(Boolean, default=True)
    cluster_nodes = Column(Integer, default=3)
    growth_years = Column(Integer, default=3)
    growth_rate = Column(Float, default=20.0)

    # Part C – Overhead params
    virt_ratio = Column(Float, default=4.0)
    cpu_overhead_pct = Column(Float, default=10.0)
    ram_overhead_pct = Column(Float, default=10.0)
    ha_reserve_pct = Column(Float, default=25.0)
    storage_snapshot_pct = Column(Float, default=20.0)
    storage_syslog_pct = Column(Float, default=15.0)
    dedup_ratio = Column(Float, default=2.0)

    # Server config
    cpu_sockets = Column(Integer, default=2)
    cores_per_socket = Column(Integer, default=16)
    ram_per_server_gb = Column(Integer, default=512)

    workload_items = relationship("WorkloadItem", back_populates="survey", cascade="all, delete-orphan")
    customer = relationship("Customer", back_populates="workload_survey")


class WorkloadItem(Base):
    __tablename__ = "workload_items"
    id = Column(Integer, primary_key=True)
    survey_id = Column(Integer, ForeignKey("workload_surveys.id"))
    order_no = Column(Integer)
    name = Column(String(255))
    workload_type = Column(String(100))
    vm_count = Column(Integer, default=1)
    vcpu_per_vm = Column(Float, default=4)
    ram_gb_per_vm = Column(Float, default=16)
    disk_os_gb_per_vm = Column(Float, default=100)
    disk_data_gb_per_vm = Column(Float, default=500)
    iops_per_vm = Column(Float, default=0)
    throughput_mbps_per_vm = Column(Float, default=0)
    os_type = Column(String(100))
    tier = Column(String(50), default="Tier 2")
    notes = Column(Text)
    survey = relationship("WorkloadSurvey", back_populates="workload_items")


class NetworkSurvey(Base):
    __tablename__ = "network_surveys"
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), unique=True)

    # Topology
    site_count = Column(Integer, default=1)
    deployment_model = Column(String(100), default="Single-site")
    site_distance_km = Column(Float)
    wan_bandwidth_gbps = Column(Float)
    wan_latency_ms = Column(Float)

    # Network fabric
    server_uplink_speed = Column(String(50), default="25GbE")
    uplink_count_per_server = Column(Integer, default=2)
    tor_switch_status = Column(String(50), default="New")
    sdn_nsx_required = Column(Boolean, default=False)
    rdma_roce_required = Column(Boolean, default=False)

    # Storage network
    storage_conn_type = Column(String(50), default="FC 16G")
    hba_nic_per_server = Column(Integer, default=2)
    fabric_switch_existing = Column(Boolean, default=False)
    fc_ports_total = Column(Integer)
    multipath_required = Column(Boolean, default=True)

    # Power & cooling
    power_kw_per_rack = Column(Float)
    rack_count = Column(Integer)
    redundant_power = Column(Boolean, default=True)
    cooling_type = Column(String(50), default="Air")

    # Compliance
    compliance_requirements = Column(Text)
    encryption_at_rest = Column(Boolean, default=False)
    encryption_in_transit = Column(Boolean, default=False)
    air_gap_required = Column(Boolean, default=False)

    customer = relationship("Customer", back_populates="network_survey")


class BackupSurvey(Base):
    __tablename__ = "backup_surveys"
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), unique=True)

    # Part A
    backup_software = Column(String(100))
    backup_target = Column(String(100))
    air_gap_immutable = Column(Boolean, default=False)
    offsite_cloud = Column(Boolean, default=False)
    cloud_target = Column(String(100))
    tape_required = Column(Boolean, default=False)

    # Tier RTO/RPO
    tier1_rpo = Column(String(50), default="15 phút")
    tier1_rto = Column(String(50), default="1 giờ")
    tier2_rpo = Column(String(50), default="4 giờ")
    tier2_rto = Column(String(50), default="4 giờ")
    tier3_rpo = Column(String(50), default="24 giờ")
    tier3_rto = Column(String(50), default="8 giờ")
    tier4_rpo = Column(String(50), default="24 giờ")
    tier4_rto = Column(String(50), default="72 giờ")

    # Part D – Calculation params
    change_rate_pct = Column(Float, default=5.0)
    dedup_ratio = Column(Float, default=3.0)
    full_retention_count = Column(Integer, default=4)
    incremental_per_day = Column(Integer, default=1)
    incremental_retention_days = Column(Integer, default=30)
    copy_offsite = Column(Boolean, default=False)
    offsite_retention_days = Column(Integer, default=90)
    repo_overhead_pct = Column(Float, default=20.0)

    backup_sources = relationship("BackupSource", back_populates="survey", cascade="all, delete-orphan")
    customer = relationship("Customer", back_populates="backup_survey")


class BackupSource(Base):
    __tablename__ = "backup_sources"
    id = Column(Integer, primary_key=True)
    survey_id = Column(Integer, ForeignKey("backup_surveys.id"))
    order_no = Column(Integer)
    name = Column(String(255))
    data_type = Column(String(100))
    size_tb = Column(Float, default=0)
    growth_rate_pct = Column(Float, default=10)
    backup_frequency = Column(String(50), default="Daily")
    retention_days = Column(Integer, default=30)
    tier = Column(String(50), default="Tier 2")
    survey = relationship("BackupSurvey", back_populates="backup_sources")


class PhysicalInventory(Base):
    __tablename__ = "physical_inventories"
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), unique=True)
    servers = Column(JSON, default=list)
    san_switches = Column(JSON, default=list)
    storage_systems = Column(JSON, default=list)
    network_devices = Column(JSON, default=list)
    wifi_aps = Column(JSON, default=list)
    virtual_machines = Column(JSON, default=list)
    customer = relationship("Customer", back_populates="physical_inventory")


class ApplicationInventory(Base):
    __tablename__ = "application_inventories"
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), unique=True)
    applications = Column(JSON, default=list)
    customer = relationship("Customer", back_populates="application_inventory")


class SecuritySurvey(Base):
    __tablename__ = "security_surveys"
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), unique=True)
    responses = Column(JSON, default=dict)
    customer = relationship("Customer", back_populates="security_survey")


class ReferenceData(Base):
    __tablename__ = "reference_data"
    id = Column(Integer, primary_key=True)
    ref_type = Column(String(100), unique=True, nullable=False)
    items = Column(JSON, default=list)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class RVToolsData(Base):
    __tablename__ = "rvtools_data"
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), unique=True)
    source_filename = Column(String(255))
    imported_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    vinfo = Column(JSON, default=list)
    vhost = Column(JSON, default=list)
    vcluster = Column(JSON, default=list)
    vdatastore = Column(JSON, default=list)
    vsnapshot = Column(JSON, default=list)
    vhealth = Column(JSON, default=list)
    vlicense = Column(JSON, default=list)
    vdisk = Column(JSON, default=list)
    summary = Column(JSON, default=dict)
    customer = relationship("Customer", back_populates="rvtools_data")


class OCPSurvey(Base):
    __tablename__ = "ocp_surveys"
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), unique=True)

    cluster_name = Column(String(255), default="Production")
    ocp_version = Column(String(20), default="4.18")
    infra_platform = Column(String(100), default="Bare Metal")
    deployment_topology = Column(String(100), default="Standard")
    network_plugin = Column(String(50), default="OVN-Kubernetes")
    ocp_virt_enabled = Column(Boolean, default=False)
    odf_enabled = Column(Boolean, default=False)
    growth_rate_pct = Column(Float, default=20.0)
    sizing_years = Column(Integer, default=3)

    master_count = Column(Integer, default=3)
    master_vcpu = Column(Integer, default=8)
    master_ram_gib = Column(Integer, default=32)
    master_disk_gb = Column(Integer, default=1024)

    worker_count = Column(Integer, default=8)
    worker_vcpu = Column(Integer, default=32)
    worker_ram_gib = Column(Integer, default=128)

    infra_count = Column(Integer, default=3)
    infra_vcpu = Column(Integer, default=4)
    infra_ram_gib = Column(Integer, default=16)
    infra_disk_gb = Column(Integer, default=500)

    odf_node_count = Column(Integer, default=3)
    odf_vcpu = Column(Integer, default=16)
    odf_ram_gib = Column(Integer, default=64)
    odf_disk_gb = Column(Integer, default=2048)

    pod_namespaces = Column(JSON, default=list)
    virt_workloads = Column(JSON, default=list)
    customer = relationship("Customer", back_populates="ocp_survey")
