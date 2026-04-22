import math
from typing import Any


def calc_compute_sizing(survey: Any, items: list) -> dict:
    total_vcpu = sum(i.vm_count * i.vcpu_per_vm for i in items if i.vm_count and i.vcpu_per_vm)
    total_ram = sum(i.vm_count * i.ram_gb_per_vm for i in items if i.vm_count and i.ram_gb_per_vm)

    vr = survey.virt_ratio or 4
    cpu_oh = (survey.cpu_overhead_pct or 10) / 100
    ram_oh = (survey.ram_overhead_pct or 10) / 100
    ha = (survey.ha_reserve_pct or 25) / 100

    pcpu_pre_ha = (total_vcpu / vr) * (1 + cpu_oh) if vr else 0
    pcpu_with_ha = pcpu_pre_ha * (1 + ha)

    ram_pre_ha = total_ram * (1 + ram_oh)
    ram_with_ha = ram_pre_ha * (1 + ha)

    cpu_per_server = (survey.cpu_sockets or 2) * (survey.cores_per_socket or 16)
    ram_per_server = survey.ram_per_server_gb or 512

    min_nodes_cpu = math.ceil(pcpu_with_ha / cpu_per_server) if cpu_per_server else 1
    min_nodes_ram = math.ceil(ram_with_ha / ram_per_server) if ram_per_server else 1
    min_nodes = max(min_nodes_cpu, min_nodes_ram, 2)

    ha_nodes = min_nodes + 1
    growth_years = survey.growth_years or 3
    growth_rate = (survey.growth_rate or 20) / 100
    growth_nodes = math.ceil(ha_nodes * ((1 + growth_rate) ** growth_years) - ha_nodes)
    total_nodes = ha_nodes + growth_nodes

    return {
        "total_vcpu": total_vcpu,
        "total_ram_gb": total_ram,
        "pcpu_pre_ha": round(pcpu_pre_ha, 1),
        "pcpu_with_ha": round(pcpu_with_ha, 1),
        "ram_pre_ha_gb": round(ram_pre_ha, 1),
        "ram_with_ha_gb": round(ram_with_ha, 1),
        "cpu_per_server": cpu_per_server,
        "ram_per_server_gb": ram_per_server,
        "min_nodes": min_nodes,
        "ha_nodes": ha_nodes,
        "growth_nodes": growth_nodes,
        "total_nodes": total_nodes,
        "total_cpu_capacity": total_nodes * cpu_per_server,
        "total_ram_capacity_gb": total_nodes * ram_per_server,
    }


def calc_storage_sizing(survey: Any, items: list) -> dict:
    total_os_gb = sum(i.vm_count * i.disk_os_gb_per_vm for i in items if i.vm_count and i.disk_os_gb_per_vm)
    total_data_gb = sum(i.vm_count * i.disk_data_gb_per_vm for i in items if i.vm_count and i.disk_data_gb_per_vm)
    total_iops = sum(i.vm_count * i.iops_per_vm for i in items if i.vm_count and i.iops_per_vm)
    total_throughput = sum(i.vm_count * i.throughput_mbps_per_vm for i in items if i.vm_count and i.throughput_mbps_per_vm)

    snap_pct = (survey.storage_snapshot_pct or 20) / 100
    sys_pct = (survey.storage_syslog_pct or 15) / 100
    dedup = survey.dedup_ratio or 2
    growth_years = survey.growth_years or 3
    growth_rate = (survey.growth_rate or 20) / 100

    raw_before_dedup = (total_os_gb + total_data_gb) * (1 + snap_pct) * (1 + sys_pct)
    usable_after_dedup = raw_before_dedup / dedup if dedup else raw_before_dedup
    usable_with_growth = usable_after_dedup * ((1 + growth_rate) ** growth_years)
    usable_tb = usable_with_growth / 1024

    raw_raid5_tb = usable_tb / 0.75
    raw_raid6_tb = usable_tb / 0.66

    return {
        "total_os_gb": round(total_os_gb, 1),
        "total_data_gb": round(total_data_gb, 1),
        "total_iops": round(total_iops),
        "total_throughput_mbps": round(total_throughput, 1),
        "raw_before_dedup_gb": round(raw_before_dedup, 1),
        "usable_after_dedup_gb": round(usable_after_dedup, 1),
        "usable_with_growth_gb": round(usable_with_growth, 1),
        "usable_tb": round(usable_tb, 2),
        "raw_raid5_tb": round(raw_raid5_tb, 2),
        "raw_raid6_tb": round(raw_raid6_tb, 2),
    }


def calc_backup_sizing(survey: Any, sources: list) -> dict:
    total_source_tb = sum(s.size_tb for s in sources if s.size_tb)

    change_rate = (survey.change_rate_pct or 5) / 100
    dedup = survey.dedup_ratio or 3
    full_copies = survey.full_retention_count or 4
    incr_per_day = survey.incremental_per_day or 1
    incr_retention = survey.incremental_retention_days or 30
    overhead = (survey.repo_overhead_pct or 20) / 100

    full_backup_tb = total_source_tb * full_copies
    incr_backup_tb = total_source_tb * change_rate * incr_per_day * incr_retention
    raw_total_tb = full_backup_tb + incr_backup_tb
    after_dedup_tb = raw_total_tb / dedup if dedup else raw_total_tb
    repo_needed_tb = after_dedup_tb * (1 + overhead)

    throughput_gbph = (total_source_tb * 1024) / 8 if total_source_tb else 0

    return {
        "total_source_tb": round(total_source_tb, 2),
        "full_backup_tb": round(full_backup_tb, 2),
        "incr_backup_tb": round(incr_backup_tb, 2),
        "raw_total_tb": round(raw_total_tb, 2),
        "after_dedup_tb": round(after_dedup_tb, 2),
        "repo_needed_tb": round(repo_needed_tb, 2),
        "min_throughput_gbph": round(throughput_gbph, 1),
    }


def calc_ocp_virt_sizing(survey: Any) -> dict:
    """Size additional OCP worker nodes needed for OpenShift Virtualization VM workloads."""
    workloads = survey.virt_workloads or []
    if not workloads:
        return {"workloads": [], "totals": {}, "additional_workers": 0, "sizing_params": {}}

    total_vcpu = sum(w.get("vm_count", 0) * w.get("vcpu_per_vm", 0) for w in workloads)
    total_ram_gib = sum(w.get("vm_count", 0) * w.get("ram_gib_per_vm", 0) for w in workloads)
    total_disk_gb = sum(w.get("vm_count", 0) * w.get("disk_gb_per_vm", 0) for w in workloads)

    # OCP Virt overhead: CPU 1:1 pCPU recommendation, RAM +20% KubeVirt overhead
    cpu_oh = 0.10
    ram_oh = 0.20
    ha_reserve = 0.25

    needed_vcpu = total_vcpu * (1 + cpu_oh) * (1 + ha_reserve)
    needed_ram_gib = total_ram_gib * (1 + ram_oh) * (1 + ha_reserve)

    worker_vcpu = survey.worker_vcpu or 32
    worker_ram = survey.worker_ram_gib or 128

    workers_for_cpu = math.ceil(needed_vcpu / worker_vcpu) if worker_vcpu else 0
    workers_for_ram = math.ceil(needed_ram_gib / worker_ram) if worker_ram else 0
    additional_workers = max(workers_for_cpu, workers_for_ram, 0)

    gr = (survey.growth_rate_pct or 20) / 100
    yrs = survey.sizing_years or 3
    additional_workers_growth = math.ceil(additional_workers * ((1 + gr) ** yrs))

    usable_disk_tb = total_disk_gb / 1024
    raw_disk_tb_raid5 = usable_disk_tb / 0.75
    raw_disk_tb_raid6 = usable_disk_tb / 0.66

    return {
        "workloads": workloads,
        "totals": {
            "total_vcpu": total_vcpu,
            "total_ram_gib": total_ram_gib,
            "total_disk_gb": total_disk_gb,
        },
        "sizing_params": {
            "needed_vcpu_with_overhead": round(needed_vcpu, 1),
            "needed_ram_gib_with_overhead": round(needed_ram_gib, 1),
            "worker_vcpu": worker_vcpu,
            "worker_ram_gib": worker_ram,
        },
        "additional_workers": additional_workers,
        "additional_workers_with_growth": additional_workers_growth,
        "storage": {
            "usable_disk_tb": round(usable_disk_tb, 2),
            "raw_raid5_tb": round(raw_disk_tb_raid5, 2),
            "raw_raid6_tb": round(raw_disk_tb_raid6, 2),
        },
    }


def calc_ocp_sizing(survey: Any) -> dict:
    gr = (survey.growth_rate_pct or 20) / 100
    yrs = survey.sizing_years or 3

    master_total_vcpu = survey.master_count * survey.master_vcpu
    master_total_ram = survey.master_count * survey.master_ram_gib
    master_total_disk = survey.master_count * survey.master_disk_gb

    worker_total_vcpu = survey.worker_count * survey.worker_vcpu
    worker_total_ram = survey.worker_count * survey.worker_ram_gib
    worker_total_vcpu_growth = math.ceil(worker_total_vcpu * ((1 + gr) ** yrs))
    worker_total_ram_growth = math.ceil(worker_total_ram * ((1 + gr) ** yrs))
    workers_needed = math.ceil(worker_total_vcpu_growth / survey.worker_vcpu) if survey.worker_vcpu else survey.worker_count

    infra_total_vcpu = survey.infra_count * survey.infra_vcpu
    infra_total_ram = survey.infra_count * survey.infra_ram_gib

    odf_total_vcpu = (survey.odf_node_count * survey.odf_vcpu) if survey.odf_enabled else 0
    odf_total_ram = (survey.odf_node_count * survey.odf_ram_gib) if survey.odf_enabled else 0
    odf_total_disk = (survey.odf_node_count * survey.odf_disk_gb) if survey.odf_enabled else 0

    return {
        "master": {"count": survey.master_count, "total_vcpu": master_total_vcpu, "total_ram_gib": master_total_ram, "total_disk_gb": master_total_disk},
        "worker": {"count": survey.worker_count, "workers_with_growth": workers_needed, "total_vcpu": worker_total_vcpu, "total_ram_gib": worker_total_ram},
        "infra": {"count": survey.infra_count, "total_vcpu": infra_total_vcpu, "total_ram_gib": infra_total_ram},
        "odf": {"enabled": survey.odf_enabled, "count": survey.odf_node_count if survey.odf_enabled else 0, "total_vcpu": odf_total_vcpu, "total_ram_gib": odf_total_ram, "total_disk_gb": odf_total_disk},
        "cluster_total": {
            "vcpu": master_total_vcpu + worker_total_vcpu + infra_total_vcpu + odf_total_vcpu,
            "ram_gib": master_total_ram + worker_total_ram + infra_total_ram + odf_total_ram,
        },
    }
