from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
import models, sizing as sz
import io
from datetime import datetime

router = APIRouter(prefix="/customers/{customer_id}/export", tags=["export-pdf"])

# ── Font setup (Vietnamese support) ──────────────────────────────────────────
def _get_fonts():
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    font_paths = [
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ("/usr/share/fonts/dejavu/DejaVuSans.ttf",
         "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"),
        ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
         "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
    ]
    for norm, bold in font_paths:
        try:
            import os
            if os.path.exists(norm) and os.path.exists(bold):
                pdfmetrics.registerFont(TTFont("SVTNormal", norm))
                pdfmetrics.registerFont(TTFont("SVTBold", bold))
                return "SVTNormal", "SVTBold"
        except Exception:
            pass
    return "Helvetica", "Helvetica-Bold"


def _build_styles(fn, fb):
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib import colors
    return {
        "title": ParagraphStyle("title", fontName=fb, fontSize=18, textColor=colors.HexColor("#003366"),
                                spaceAfter=6, leading=22),
        "subtitle": ParagraphStyle("subtitle", fontName=fn, fontSize=11, textColor=colors.HexColor("#555555"),
                                   spaceAfter=12),
        "section": ParagraphStyle("section", fontName=fb, fontSize=13, textColor=colors.white,
                                  backColor=colors.HexColor("#0070C0"), spaceAfter=6,
                                  spaceBefore=14, leftIndent=6, leading=18),
        "body": ParagraphStyle("body", fontName=fn, fontSize=9, spaceAfter=3, leading=12),
        "label": ParagraphStyle("label", fontName=fb, fontSize=9, textColor=colors.HexColor("#333333")),
        "header": ParagraphStyle("header", fontName=fb, fontSize=9, textColor=colors.white),
        "result": ParagraphStyle("result", fontName=fb, fontSize=11, textColor=colors.HexColor("#006400")),
        "footer": ParagraphStyle("footer", fontName=fn, fontSize=8, textColor=colors.HexColor("#888888"),
                                 alignment=1),
    }


DARK_BLUE = "#003366"
MID_BLUE = "#0070C0"
LIGHT_BLUE = "#DDEEFF"
GREEN = "#70AD47"
YELLOW = "#FFFF00"
GRAY = "#F2F2F2"


def _tbl_style(header_color=MID_BLUE):
    from reportlab.platypus import TableStyle
    from reportlab.lib import colors
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(header_color)),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "SVTBold" if "SVTBold" in str(_get_fonts()) else "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(GRAY)]),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CCCCCC")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("WORDWRAP", (0, 0), (-1, -1), True),
    ])


def _page_footer(canvas, doc, customer_name, report_type):
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColorRGB(0.5, 0.5, 0.5)
    canvas.drawString(20, 15, f"SVT Survey Tool – {report_type} | {customer_name} | {datetime.now().strftime('%d/%m/%Y')}")
    canvas.drawRightString(doc.pagesize[0] - 20, 15, f"Trang {canvas.getPageNumber()}")
    canvas.restoreState()


# ── Inventory PDF ─────────────────────────────────────────────────────────────

def build_inventory_pdf(customer_id: int, db: Session) -> io.BytesIO:
    from reportlab.platypus import SimpleDocTemplate, Table, Paragraph, Spacer, PageBreak, HRFlowable
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    import functools

    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")

    inv = db.query(models.PhysicalInventory).filter(models.PhysicalInventory.customer_id == customer_id).first()
    app_inv = db.query(models.ApplicationInventory).filter(models.ApplicationInventory.customer_id == customer_id).first()

    fn, fb = _get_fonts()
    S = _build_styles(fn, fb)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4),
                            leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=20*mm, bottomMargin=18*mm)

    story = []
    P = lambda txt, style="body": Paragraph(str(txt) if txt else "", S[style])
    HR = lambda: HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#AAAAAA"), spaceAfter=6)

    # Cover
    story.append(Spacer(1, 20*mm))
    story.append(P("INFRASTRUCTURE INVENTORY REPORT", "title"))
    story.append(P("Báo cáo Kiểm kê Hạ tầng CNTT", "subtitle"))
    story.append(HR())

    info = [
        ["Khách hàng / Customer:", c.name or ""],
        ["Dự án / Project:", c.project_name or ""],
        ["Người phụ trách:", c.contact or ""],
        ["Email:", c.email or ""],
        ["Presales:", c.presales or ""],
        ["Ngày khảo sát:", c.survey_date or ""],
        ["Ngày xuất báo cáo:", datetime.now().strftime("%d/%m/%Y %H:%M")],
    ]
    info_tbl = Table([[P(r[0], "header"), P(r[1])] for r in info], colWidths=[80*mm, 160*mm])
    info_tbl.setStyle(_tbl_style(DARK_BLUE))
    story.append(info_tbl)

    def section_table(title, headers, rows, col_widths=None):
        story.append(Spacer(1, 8*mm))
        story.append(P(f"  {title}", "section"))
        if not rows:
            story.append(P("   (Không có dữ liệu)", "body"))
            return
        data = [[P(h, "header") for h in headers]]
        for row in rows:
            data.append([P(str(v) if v is not None else "") for v in row])
        tbl = Table(data, colWidths=col_widths, repeatRows=1)
        tbl.setStyle(_tbl_style())
        story.append(tbl)

    # Servers
    servers = (inv.servers or []) if inv else []
    section_table(
        "I. PHYSICAL SERVERS",
        ["#", "Tên thiết bị", "Model", "Vendor", "Serial", "SL", "Vị trí", "CPU", "RAM (GB)", "Trạng thái", "Ghi chú"],
        [[i+1, s.get("name",""), s.get("model",""), s.get("vendor",""), s.get("serial",""),
          s.get("qty",1), s.get("location",""), s.get("cpu",""), s.get("ram_gb",""),
          s.get("status",""), s.get("notes","")] for i, s in enumerate(servers)],
        col_widths=[8*mm,40*mm,40*mm,22*mm,30*mm,10*mm,30*mm,30*mm,16*mm,22*mm,None]
    )

    # SAN Switches
    sans = (inv.san_switches or []) if inv else []
    section_table(
        "II. SAN SWITCHES",
        ["#", "Tên thiết bị", "Model", "Vendor", "Serial", "SL", "Vị trí", "Số port", "Tốc độ", "Trạng thái", "Ghi chú"],
        [[i+1, s.get("name",""), s.get("model",""), s.get("vendor",""), s.get("serial",""),
          s.get("qty",1), s.get("location",""), s.get("ports",""), s.get("speed",""),
          s.get("status",""), s.get("notes","")] for i, s in enumerate(sans)],
    )

    # Storage
    stors = (inv.storage_systems or []) if inv else []
    section_table(
        "III. STORAGE SYSTEMS",
        ["#", "Tên thiết bị", "Model", "Vendor", "Serial", "SL", "Loại", "Raw (TB)", "Usable (TB)", "Trạng thái", "Ghi chú"],
        [[i+1, s.get("name",""), s.get("model",""), s.get("vendor",""), s.get("serial",""),
          s.get("qty",1), s.get("storage_type",""), s.get("raw_capacity_tb",""), s.get("usable_capacity_tb",""),
          s.get("status",""), s.get("notes","")] for i, s in enumerate(stors)],
    )

    # Network Devices
    nets = (inv.network_devices or []) if inv else []
    section_table(
        "IV. NETWORK DEVICES",
        ["#", "Tên thiết bị", "Model", "Vendor", "Serial", "SL", "Loại", "IP Mgmt", "Vị trí", "Trạng thái", "Ghi chú"],
        [[i+1, s.get("name",""), s.get("model",""), s.get("vendor",""), s.get("serial",""),
          s.get("qty",1), s.get("device_type",""), s.get("ip_mgmt",""),
          s.get("location",""), s.get("status",""), s.get("notes","")] for i, s in enumerate(nets)],
    )

    # WiFi APs
    wifis = (inv.wifi_aps or []) if inv else []
    section_table(
        "V. WIFI ACCESS POINTS",
        ["#", "Tên thiết bị", "Model", "Vendor", "SL", "Vị trí", "Band", "SSID", "Trạng thái", "Ghi chú"],
        [[i+1, s.get("name",""), s.get("model",""), s.get("vendor",""),
          s.get("qty",1), s.get("location",""), s.get("band",""), s.get("ssid",""),
          s.get("status",""), s.get("notes","")] for i, s in enumerate(wifis)],
    )

    # Tape Libraries
    tapes = (inv.tape_libraries or []) if inv else []
    section_table(
        "VI. TAPE LIBRARIES",
        ["#", "Tên thiết bị", "Model", "Vendor", "Serial", "SL", "Drive Type", "Drives", "Slots",
         "Capacity (TB)", "Backup SW", "Trạng thái", "Ghi chú"],
        [[i+1, s.get("name",""), s.get("model",""), s.get("vendor",""), s.get("serial",""),
          s.get("qty",1), s.get("drive_type",""), s.get("drive_count",""), s.get("slot_count",""),
          s.get("raw_capacity_tb",""), s.get("software",""), s.get("status",""), s.get("notes","")]
         for i, s in enumerate(tapes)],
        col_widths=[8*mm,32*mm,32*mm,20*mm,25*mm,8*mm,22*mm,14*mm,12*mm,20*mm,22*mm,20*mm,None]
    )

    # Virtual Machines
    vms = (inv.virtual_machines or []) if inv else []
    section_table(
        "VII. VIRTUAL MACHINES",
        ["#", "Tên VM", "OS", "vCPU", "RAM (GB)", "Disk (GB)", "Cluster", "Host", "Hypervisor", "Power", "Trạng thái"],
        [[i+1, s.get("name",""), s.get("os_type","") or s.get("guest_os",""),
          s.get("vcpu",""), s.get("ram_gb",""), s.get("disk_gb",""),
          s.get("cluster",""), s.get("host_server",""), s.get("hypervisor",""),
          s.get("power_state",""), s.get("status","")]
         for i, s in enumerate(vms)],
        col_widths=[8*mm,36*mm,30*mm,14*mm,16*mm,16*mm,26*mm,28*mm,26*mm,14*mm,None]
    )

    # Applications
    story.append(PageBreak())
    apps = (app_inv.applications or []) if app_inv else []
    section_table(
        "VI. APPLICATION INVENTORY",
        ["#", "Tên ứng dụng", "Phiên bản", "Vendor", "Loại", "Môi trường", "Server", "Database", "OS",
         "Criticality", "Hết hỗ trợ", "Ghi chú"],
        [[i+1, a.get("name",""), a.get("version",""), a.get("vendor",""), a.get("app_type",""),
          a.get("environment",""), a.get("servers",""), a.get("database",""), a.get("os",""),
          a.get("criticality",""), a.get("support_expiry",""), a.get("notes","")]
         for i, a in enumerate(apps)],
        col_widths=[8*mm,38*mm,22*mm,22*mm,22*mm,22*mm,30*mm,22*mm,22*mm,28*mm,22*mm,None]
    )

    # Summary
    story.append(Spacer(1, 8*mm))
    story.append(P("  TỔNG KẾT INVENTORY", "section"))
    summary_data = [
        [P("Hạng mục", "header"), P("Số lượng thiết bị / ứng dụng", "header")],
        ["Physical Servers", str(len(servers))],
        ["SAN Switches", str(len(sans))],
        ["Storage Systems", str(len(stors))],
        ["Network Devices", str(len(nets))],
        ["WiFi Access Points", str(len(wifis))],
        ["Tape Libraries", str(len(tapes))],
        ["Virtual Machines", str(len(vms))],
        ["Applications", str(len(apps))],
        [P("TỔNG CỘNG", "header"), P(str(len(servers)+len(sans)+len(stors)+len(nets)+len(wifis)+len(tapes)+len(vms)+len(apps)), "header")],
    ]
    sum_tbl = Table(summary_data, colWidths=[100*mm, 80*mm])
    sum_tbl.setStyle(_tbl_style())
    story.append(sum_tbl)

    footer_cb = functools.partial(_page_footer, customer_name=c.name, report_type="Inventory Report")
    doc.build(story, onFirstPage=footer_cb, onLaterPages=footer_cb)
    buf.seek(0)
    return buf


# ── Sizing PDF ────────────────────────────────────────────────────────────────

def build_sizing_pdf(customer_id: int, db: Session) -> io.BytesIO:
    from reportlab.platypus import SimpleDocTemplate, Table, Paragraph, Spacer, HRFlowable
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    import functools

    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")

    ws = db.query(models.WorkloadSurvey).filter(models.WorkloadSurvey.customer_id == customer_id).first()
    items = db.query(models.WorkloadItem).filter(models.WorkloadItem.survey_id == ws.id).all() if ws else []
    bk = db.query(models.BackupSurvey).filter(models.BackupSurvey.customer_id == customer_id).first()
    sources = db.query(models.BackupSource).filter(models.BackupSource.survey_id == bk.id).all() if bk else []
    ocp = db.query(models.OCPSurvey).filter(models.OCPSurvey.customer_id == customer_id).first()

    fn, fb = _get_fonts()
    S = _build_styles(fn, fb)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=20*mm, bottomMargin=18*mm)

    story = []
    P = lambda txt, style="body": Paragraph(str(txt) if txt else "", S[style])
    HR = lambda: HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#AAAAAA"), spaceAfter=6)

    # Cover
    story.append(Spacer(1, 15*mm))
    story.append(P("INFRASTRUCTURE SIZING REPORT", "title"))
    story.append(P("Báo cáo Sizing Hạ tầng CNTT", "subtitle"))
    story.append(HR())

    info_rows = [
        ["Khách hàng:", c.name or ""], ["Dự án:", c.project_name or ""],
        ["Presales:", c.presales or ""], ["Ngày khảo sát:", c.survey_date or ""],
        ["Ngày xuất báo cáo:", datetime.now().strftime("%d/%m/%Y %H:%M")],
    ]
    info_tbl = Table([[P(r[0], "header"), P(r[1])] for r in info_rows], colWidths=[50*mm, 120*mm])
    info_tbl.setStyle(_tbl_style(DARK_BLUE))
    story.append(info_tbl)

    def section_header(title):
        story.append(Spacer(1, 6*mm))
        story.append(P(f"  {title}", "section"))

    def kv_table(rows):
        data = [[P(r[0], "label"), P(str(r[1]) if r[1] is not None else "", "result" if len(r) > 2 else "body"),
                 P(r[2] if len(r) > 2 else "")] for r in rows]
        tbl = Table(data, colWidths=[80*mm, 40*mm, 60*mm])
        tbl.setStyle(_tbl_style())
        story.append(tbl)

    # Workload list
    if items:
        section_header("I. WORKLOAD SURVEY")
        wl_data = [[P(h, "header") for h in ["#", "Tên Workload", "Loại", "Số VM", "vCPU/VM", "RAM GB/VM",
                                             "Disk OS GB", "Disk Data GB", "IOPS", "Tier"]]]
        for i, it in enumerate(items):
            wl_data.append([P(str(i+1)), P(it.name or ""), P(it.workload_type or ""),
                            P(str(it.vm_count or 0)), P(str(it.vcpu_per_vm or 0)),
                            P(str(it.ram_gb_per_vm or 0)), P(str(it.disk_os_gb_per_vm or 0)),
                            P(str(it.disk_data_gb_per_vm or 0)), P(str(it.iops_per_vm or 0)),
                            P(it.tier or "")])
        wl_tbl = Table(wl_data, colWidths=[10*mm,40*mm,28*mm,16*mm,16*mm,18*mm,18*mm,20*mm,16*mm,None],
                       repeatRows=1)
        wl_tbl.setStyle(_tbl_style())
        story.append(wl_tbl)

    # Compute sizing
    if ws and items:
        comp = sz.calc_compute_sizing(ws, items)
        stor = sz.calc_storage_sizing(ws, items)

        section_header("II. SIZING COMPUTE / SERVER")
        kv_table([
            ["Tổng vCPU yêu cầu", f"{comp['total_vcpu']} vCPUs"],
            ["Tổng RAM yêu cầu", f"{comp['total_ram_gb']} GB"],
            ["pCPU cores (trước HA)", f"{comp['pcpu_pre_ha']} cores"],
            ["pCPU cores (sau HA)", f"{comp['pcpu_with_ha']} cores"],
            ["RAM (sau HA)", f"{comp['ram_with_ha_gb']} GB"],
            ["⭐ Số server đề xuất", f"{comp['total_nodes']} nodes",
             f"{ws.cpu_sockets*ws.cores_per_socket} cores, {ws.ram_per_server_gb} GB RAM/server"],
            ["  └ Min nodes (tính toán)", f"{comp['min_nodes']} nodes"],
            ["  └ Sau HA (N+1)", f"{comp['ha_nodes']} nodes"],
            ["  └ Dự phòng tăng trưởng", f"{comp['growth_nodes']} nodes",
             f"{ws.growth_years} năm @ {ws.growth_rate}%/năm"],
        ])

        section_header("III. SIZING PRIMARY STORAGE")
        kv_table([
            ["Tổng Disk OS", f"{stor['total_os_gb']} GB"],
            ["Tổng Disk Data", f"{stor['total_data_gb']} GB"],
            ["Total IOPS yêu cầu", f"{stor['total_iops']} IOPS"],
            ["Raw trước dedup", f"{stor['raw_before_dedup_gb']} GB"],
            ["Usable sau dedup/compress", f"{stor['usable_tb']} TB"],
            ["⭐ Raw cần thiết (RAID 5)", f"{stor['raw_raid5_tb']} TB", "75% efficiency"],
            ["⭐ Raw cần thiết (RAID 6)", f"{stor['raw_raid6_tb']} TB", "66% efficiency"],
        ])

    # Backup sizing
    if bk and sources:
        bk_sz = sz.calc_backup_sizing(bk, sources)
        section_header("IV. SIZING BACKUP REPOSITORY")
        kv_table([
            ["Tổng nguồn backup", f"{bk_sz['total_source_tb']} TB"],
            ["Full backup (trước dedup)", f"{bk_sz['full_backup_tb']} TB"],
            ["Incremental backup", f"{bk_sz['incr_backup_tb']} TB"],
            ["Sau dedup/compress", f"{bk_sz['after_dedup_tb']} TB"],
            ["⭐ Repository cần thiết", f"{bk_sz['repo_needed_tb']} TB", "Bao gồm overhead"],
            ["Throughput tối thiểu", f"{bk_sz['min_throughput_gbph']} GB/h"],
        ])

    # OCP sizing
    if ocp:
        ocp_sz = sz.calc_ocp_sizing(ocp)
        section_header(f"V. SIZING OPENSHIFT {ocp.ocp_version}")
        ocp_data = [[P(h, "header") for h in ["Loại Node", "Số lượng", "Total vCPU", "Total RAM (GiB)", "Ghi chú"]]]
        for name, data, note in [
            ("Control Plane (Master)", ocp_sz["master"], "etcd, API, Scheduler"),
            ("Worker Nodes", ocp_sz["worker"], f"Tăng trưởng → {ocp_sz['worker']['workers_with_growth']} nodes"),
            ("Infrastructure Nodes", ocp_sz["infra"], "Router, Registry, Monitoring"),
        ]:
            ocp_data.append([P(name), P(str(data["count"])), P(str(data["total_vcpu"])),
                             P(str(data["total_ram_gib"])), P(note)])
        if ocp.odf_enabled:
            ocp_data.append([P("ODF Storage Nodes"), P(str(ocp_sz["odf"]["count"])),
                            P(str(ocp_sz["odf"]["total_vcpu"])), P(str(ocp_sz["odf"]["total_ram_gib"])),
                            P("Ceph OSD, MON, MGR")])
        ocp_data.append([P("⭐ CLUSTER TOTAL", "label"), P(""), P(str(ocp_sz["cluster_total"]["vcpu"]), "result"),
                        P(str(ocp_sz["cluster_total"]["ram_gib"]) + " GiB", "result"), P("")])
        ocp_tbl = Table(ocp_data, colWidths=[55*mm, 22*mm, 25*mm, 30*mm, None], repeatRows=1)
        ocp_tbl.setStyle(_tbl_style())
        story.append(ocp_tbl)

    # BOM summary
    section_header("VI. BILL OF MATERIALS – TÓM TẮT")
    bom_rows = [[P("Hạng mục", "header"), P("Kết quả Sizing", "header"), P("Ghi chú", "header")]]
    if ws and items:
        comp = sz.calc_compute_sizing(ws, items)
        stor = sz.calc_storage_sizing(ws, items)
        bom_rows += [
            [P("I. Compute / Server"), P(f"{comp['total_nodes']} nodes", "result"),
             P(f"{ws.cpu_sockets*ws.cores_per_socket} cores, {ws.ram_per_server_gb} GB/server")],
            [P("II. Primary Storage (RAID 5)"), P(f"{stor['raw_raid5_tb']} TB raw", "result"), P("75% eff.")],
            [P("II. Primary Storage (RAID 6)"), P(f"{stor['raw_raid6_tb']} TB raw", "result"), P("66% eff.")],
        ]
    if bk and sources:
        bk_sz = sz.calc_backup_sizing(bk, sources)
        bom_rows.append([P("III. Backup Repository"), P(f"{bk_sz['repo_needed_tb']} TB", "result"), P("")])
    if len(bom_rows) > 1:
        bom_tbl = Table(bom_rows, colWidths=[65*mm, 50*mm, None], repeatRows=1)
        bom_tbl.setStyle(_tbl_style(DARK_BLUE))
        story.append(bom_tbl)

    footer_cb = functools.partial(_page_footer, customer_name=c.name, report_type="Sizing Report")
    doc.build(story, onFirstPage=footer_cb, onLaterPages=footer_cb)
    buf.seek(0)
    return buf


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/inventory-pdf")
def export_inventory_pdf(customer_id: int, db: Session = Depends(get_db)):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    buf = build_inventory_pdf(customer_id, db)
    fname = f"SVT_Inventory_{c.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": f"attachment; filename={fname}"})


@router.get("/sizing-pdf")
def export_sizing_pdf(customer_id: int, db: Session = Depends(get_db)):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    buf = build_sizing_pdf(customer_id, db)
    fname = f"SVT_Sizing_{c.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": f"attachment; filename={fname}"})
