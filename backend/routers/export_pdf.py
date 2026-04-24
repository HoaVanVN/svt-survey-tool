from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
import models, sizing as sz
import io
from datetime import datetime
from typing import Optional

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


def _kv_tbl_style():
    """Style for key-value info tables (no header row): light-blue label column, alternating value rows."""
    from reportlab.platypus import TableStyle
    from reportlab.lib import colors
    fn, fb = _get_fonts()
    return TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor(LIGHT_BLUE)),
        ("FONTNAME", (0, 0), (0, -1), fb),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (1, 0), (-1, -1), [colors.white, colors.HexColor(GRAY)]),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CCCCCC")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("WORDWRAP", (0, 0), (-1, -1), True),
    ])


def _summary_tbl_style():
    """Style for summary tables: blue header row, alternating data rows, green highlight on last (total) row."""
    from reportlab.platypus import TableStyle
    from reportlab.lib import colors
    fn, fb = _get_fonts()
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(MID_BLUE)),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), fb),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(GRAY)]),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#E2EFDA")),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.HexColor("#375623")),
        ("FONTNAME", (0, -1), (-1, -1), fb),
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


# ── Chart drawing helpers ─────────────────────────────────────────────────────

def _parse_eos_date(val):
    """Parse EOS/expiry date string → datetime or None."""
    if not val:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(str(val).strip()[:10], fmt)
        except Exception:
            pass
    return None


def _drawing_hbar(rows, w_mm, h_mm, title="", bar_color="#0070C0"):
    """Horizontal bar chart. rows=[(label, value), ...]. Returns Drawing or None."""
    try:
        from reportlab.graphics.shapes import Drawing, Rect, String, Line
        from reportlab.lib import colors
        from reportlab.lib.units import mm

        rows = [(str(l)[:24], int(v)) for l, v in rows if int(v) > 0]
        if not rows:
            return None

        w, h = w_mm * mm, h_mm * mm
        d = Drawing(w, h)
        max_val = max(v for _, v in rows) or 1
        title_h = 14 if title else 0
        pad_b, pad_r = 6, 10
        label_w = 82
        axis_x = label_w + 4
        axis_w = w - axis_x - pad_r
        chart_top = h - title_h - 4
        n = len(rows)
        row_h = (chart_top - pad_b) / n
        bar_h = max(6, row_h * 0.65)

        if title:
            d.add(String(w / 2, h - 10, title, fontSize=8, fontName='Helvetica-Bold',
                         textAnchor='middle', fillColor=colors.HexColor("#003366")))
        d.add(Line(axis_x, pad_b, axis_x, chart_top,
                   strokeColor=colors.HexColor("#CCCCCC"), strokeWidth=0.5))

        for i, (label, val) in enumerate(rows):
            y = chart_top - (i + 1) * row_h + (row_h - bar_h) / 2
            bw = (val / max_val) * axis_w
            d.add(String(axis_x - 3, y + bar_h * 0.28, label,
                         fontSize=6.5, fontName='Helvetica', textAnchor='end',
                         fillColor=colors.HexColor("#444444")))
            if bw > 0:
                d.add(Rect(axis_x, y, bw, bar_h,
                           fillColor=colors.HexColor(bar_color), strokeColor=None))
            d.add(String(axis_x + bw + 2, y + bar_h * 0.28, str(val),
                         fontSize=6, fontName='Helvetica',
                         fillColor=colors.HexColor("#333333")))
        return d
    except Exception:
        return None


def _drawing_pie(slices, w_mm, h_mm, title=""):
    """Pie chart with legend. slices=[(label, value, '#RRGGBB'), ...]. Returns Drawing or None."""
    try:
        from reportlab.graphics.shapes import Drawing, String, Rect
        from reportlab.graphics.charts.piecharts import Pie
        from reportlab.lib import colors
        from reportlab.lib.units import mm

        active = [(str(l), int(v), c) for l, v, c in slices if int(v) > 0]
        if not active:
            return None

        w, h = w_mm * mm, h_mm * mm
        d = Drawing(w, h)
        total = sum(v for _, v, _ in active)

        title_h = 14 if title else 0
        legend_row_h = 11
        legend_h = len(active) * legend_row_h + 4
        pie_area_h = h - title_h - legend_h - 8
        radius = min(w * 0.36, pie_area_h * 0.44)
        cx = w / 2
        cy = h - title_h - radius - 4

        if title:
            d.add(String(w / 2, h - 10, title, fontSize=8, fontName='Helvetica-Bold',
                         textAnchor='middle', fillColor=colors.HexColor("#003366")))

        pie = Pie()
        pie.x = cx - radius
        pie.y = cy - radius
        pie.width = pie.height = radius * 2
        pie.data = [v for _, v, _ in active]
        pie.labels = [''] * len(active)
        pie.sideLabels = 0
        pie.slices.strokeColor = colors.white
        pie.slices.strokeWidth = 1
        for i, (_, _, chex) in enumerate(active):
            pie.slices[i].fillColor = colors.HexColor(chex)
        d.add(pie)

        for i, (label, val, chex) in enumerate(active):
            ly = legend_h - (i + 1) * legend_row_h
            d.add(Rect(4, ly, 8, 7, fillColor=colors.HexColor(chex), strokeColor=None))
            pct = val * 100 // total if total else 0
            d.add(String(15, ly + 1, f"{label}: {val} ({pct}%)",
                         fontSize=6.5, fontName='Helvetica',
                         fillColor=colors.HexColor("#333333")))
        return d
    except Exception:
        return None


def _drawing_grouped_bar(labels, series_data, w_mm, h_mm,
                          series_colors, series_labels, title=""):
    """Vertical grouped bar chart.
    labels: x-axis group names; series_data: list of value-lists (one per series).
    Returns Drawing or None.
    """
    try:
        from reportlab.graphics.shapes import Drawing, Rect, String, Line
        from reportlab.lib import colors
        from reportlab.lib.units import mm

        n_g = len(labels)
        n_s = len(series_data)
        if not n_g or not n_s:
            return None
        all_vals = [v for s in series_data for v in s]
        if not all_vals or max(all_vals) == 0:
            return None

        w, h = w_mm * mm, h_mm * mm
        max_val = max(all_vals) or 1
        d = Drawing(w, h)

        title_h = 14 if title else 0
        legend_h = 14
        pad_l, pad_b, pad_r = 8, 22, 8
        chart_l = pad_l
        chart_b = pad_b + legend_h
        chart_w = w - chart_l - pad_r
        chart_h = h - title_h - chart_b - 8
        group_w = chart_w / n_g
        bar_w = group_w / (n_s + 0.5)

        if title:
            d.add(String(w / 2, h - 10, title, fontSize=8, fontName='Helvetica-Bold',
                         textAnchor='middle', fillColor=colors.HexColor("#003366")))
        d.add(Line(chart_l, chart_b, chart_l, chart_b + chart_h,
                   strokeColor=colors.HexColor("#AAAAAA"), strokeWidth=0.5))
        d.add(Line(chart_l, chart_b, chart_l + chart_w, chart_b,
                   strokeColor=colors.HexColor("#AAAAAA"), strokeWidth=0.5))

        for g, grp_label in enumerate(labels):
            gx = chart_l + g * group_w + group_w * 0.05
            d.add(String(chart_l + g * group_w + group_w / 2, chart_b - 12,
                         str(grp_label)[:18],
                         fontSize=6.5, fontName='Helvetica', textAnchor='middle',
                         fillColor=colors.HexColor("#333333")))
            for s, (sdata, shex) in enumerate(zip(series_data, series_colors)):
                val = sdata[g] if g < len(sdata) else 0
                bx = gx + s * bar_w
                bh = (val / max_val) * chart_h
                if bh > 0:
                    d.add(Rect(bx, chart_b, bar_w * 0.9, bh,
                               fillColor=colors.HexColor(shex), strokeColor=None))
                if val > 0:
                    lbl = f"{val:.1f}" if isinstance(val, float) and val != int(val) else str(int(val))
                    d.add(String(bx + bar_w * 0.45, chart_b + bh + 1, lbl,
                                 fontSize=5.5, fontName='Helvetica', textAnchor='middle',
                                 fillColor=colors.HexColor("#333333")))

        for i, (slbl, shex) in enumerate(zip(series_labels, series_colors)):
            lx = chart_l + i * (chart_w / max(n_s, 1))
            d.add(Rect(lx, 3, 8, 7, fillColor=colors.HexColor(shex), strokeColor=None))
            d.add(String(lx + 11, 4, slbl, fontSize=6.5, fontName='Helvetica',
                         fillColor=colors.HexColor("#333333")))

        return d
    except Exception:
        return None


# ── Inventory PDF ─────────────────────────────────────────────────────────────

def build_inventory_pdf(customer_id: int, db: Session, *, report_title=None, prepared_by=None,
                        department=None, custom_note=None, include_diagrams=True) -> io.BytesIO:
    from reportlab.platypus import SimpleDocTemplate, Table, Paragraph, Spacer, PageBreak, HRFlowable, Image
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.utils import ImageReader
    import functools
    import base64

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
    title_text = report_title if report_title else "INFRASTRUCTURE INVENTORY REPORT"
    story.append(P(title_text, "title"))
    story.append(P("Báo cáo Kiểm kê Hạ tầng CNTT", "subtitle"))
    story.append(HR())

    info = [
        ["Khách hàng / Customer:", c.name or ""],
        ["Dự án / Project:", c.project_name or ""],
        ["Người phụ trách:", c.contact or ""],
        ["Email:", c.email or ""],
        ["Presales:", c.presales or ""],
        ["Ngày khảo sát:", c.survey_date or ""],
    ]
    if prepared_by:
        info.append(["Người lập báo cáo:", prepared_by])
    if department:
        info.append(["Phòng ban / Đơn vị:", department])
    info.append(["Ngày xuất báo cáo:", datetime.now().strftime("%d/%m/%Y %H:%M")])

    info_tbl = Table([[P(r[0], "label"), P(r[1])] for r in info], colWidths=[80*mm, 160*mm])
    info_tbl.setStyle(_kv_tbl_style())
    story.append(info_tbl)

    if custom_note:
        story.append(P(f"📝 Ghi chú: {custom_note}", "body"))

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

    # ── Visual Summary (charts) ───────────────────────────────────────────────
    try:
        from collections import Counter as _Ctr
        from reportlab.platypus import TableStyle as _TS

        _srv  = (inv.servers or []) if inv else []
        _san  = (inv.san_switches or []) if inv else []
        _st   = (inv.storage_systems or []) if inv else []
        _net  = (inv.network_devices or []) if inv else []
        _wf   = (inv.wifi_aps or []) if inv else []
        _tp   = (inv.tape_libraries or []) if inv else []
        _vm   = (inv.virtual_machines or []) if inv else []
        _sr   = (inv.server_rooms or []) if inv else []
        _wl   = (inv.wan_links or []) if inv else []
        _ap   = (app_inv.applications or []) if app_inv else []

        # Category count chart
        _cat = [(l, c) for l, c in [
            ('Servers', len(_srv)), ('SAN Switches', len(_san)),
            ('Storage', len(_st)), ('Network', len(_net)),
            ('WiFi APs', len(_wf)), ('Tape Libs', len(_tp)),
            ('VMs', len(_vm)), ('Server Rooms', len(_sr)),
            ('WAN Links', len(_wl)), ('Apps', len(_ap)),
        ] if c > 0]

        # EOS status counts
        _today = datetime.now()
        _exp = _near = _ok = 0
        for _il in [_srv, _san, _st, _net, _wf, _tp, _wl]:
            for _it in _il:
                _ev = (_it.get('support_until') or _it.get('end_of_support') or
                       _it.get('support_expiry') or _it.get('contract_expiry'))
                _ed = _parse_eos_date(_ev)
                _qty = int(_it.get('qty') or 1)
                if _ed:
                    if _ed < _today:
                        _exp += _qty
                    elif (_ed - _today).days <= 365:
                        _near += _qty
                    else:
                        _ok += _qty
                else:
                    _ok += _qty

        # Vendor distribution (top 10)
        _vc = _Ctr()
        for _il in [_srv, _san, _st, _net, _wf, _tp]:
            for _it in _il:
                _vc[(_it.get('vendor') or 'N/A').strip() or 'N/A'] += int(_it.get('qty') or 1)
        for _it in _wl:
            _vc[(_it.get('isp') or 'N/A').strip() or 'N/A'] += 1
        _vnd_rows = _vc.most_common(10)

        # Location distribution (top 10)
        _lc = _Ctr()
        for _il in [_srv, _san, _st, _net, _wf, _tp]:
            for _it in _il:
                _lc[(_it.get('location') or 'N/A').strip() or 'N/A'] += int(_it.get('qty') or 1)
        for _it in _sr:
            _lc[(_it.get('location') or _it.get('name') or 'N/A').strip() or 'N/A'] += int(_it.get('rack_count') or 1)
        for _it in _wl:
            _lc[(_it.get('site_name') or 'N/A').strip() or 'N/A'] += 1
        _loc_rows = _lc.most_common(10)

        story.append(Spacer(1, 5*mm))
        story.append(P("  TÓM TẮT TRỰC QUAN / VISUAL SUMMARY", "section"))

        # Row 1: category count bar (158mm) + EOS status pie (100mm)
        _d1 = _drawing_hbar(_cat, 158, 80, "Device Count by Category", "#0070C0")
        _d2 = _drawing_pie([
            ("Active / OK",    _ok,   "#70AD47"),
            ("Near EOS ≤1yr",  _near, "#FFC000"),
            ("EOS Expired",    _exp,  "#C00000"),
        ], 100, 80, "Support Status")
        if _d1 or _d2:
            _r1 = Table([[_d1 or Spacer(1, 1), _d2 or Spacer(1, 1)]],
                        colWidths=[158*mm, 100*mm])
            _r1.setStyle(_TS([("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                               ("LEFTPADDING", (0, 0), (-1, -1), 2),
                               ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                               ("TOPPADDING", (0, 0), (-1, -1), 4),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
            story.append(_r1)

        # Row 2: vendor bar (130mm) + location bar (128mm)
        _d3 = _drawing_hbar(_vnd_rows, 130, 85, "Top Vendors", "#2E75B6")
        _d4 = _drawing_hbar(_loc_rows, 128, 85, "Top Locations", "#548235")
        if _d3 or _d4:
            _r2 = Table([[_d3 or Spacer(1, 1), _d4 or Spacer(1, 1)]],
                        colWidths=[130*mm, 128*mm])
            _r2.setStyle(_TS([("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                               ("LEFTPADDING", (0, 0), (-1, -1), 2),
                               ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                               ("TOPPADDING", (0, 0), (-1, -1), 4),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
            story.append(_r2)

    except Exception:
        pass  # charts are best-effort; never break the PDF

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

    def _stor_raw(s):
        tiers = s.get("tier_capacities") or []
        if tiers:
            return round(sum(float(t.get("raw_tb") or 0) for t in tiers), 2)
        return s.get("raw_capacity_tb", "") or ""

    def _stor_usable(s):
        tiers = s.get("tier_capacities") or []
        if tiers:
            return round(sum(float(t.get("usable_tb") or 0) for t in tiers), 2)
        return s.get("usable_capacity_tb", "") or ""

    def _stor_tiers(s):
        tiers = s.get("tier_capacities") or []
        if not tiers:
            return s.get("notes", "")
        tier_str = " | ".join(
            f"{t.get('tier','')} R:{float(t.get('raw_tb') or 0):.1f}/U:{float(t.get('usable_tb') or 0):.1f}TB"
            for t in tiers
        )
        notes = s.get("notes", "")
        return f"{tier_str}  {notes}".strip() if notes else tier_str

    section_table(
        "III. STORAGE SYSTEMS",
        ["#", "Tên thiết bị", "Model", "Vendor", "Serial", "SL", "Loại", "Raw (TB)", "Usable (TB)", "Trạng thái", "Disk Tiers / Ghi chú"],
        [[i+1, s.get("name",""), s.get("model",""), s.get("vendor",""), s.get("serial",""),
          s.get("qty",1), s.get("storage_type",""), _stor_raw(s), _stor_usable(s),
          s.get("status",""), _stor_tiers(s)] for i, s in enumerate(stors)],
    )

    # Storage capacity chart (Raw vs Usable per system)
    try:
        _stor_chart_data = [
            (s.get('name','') or s.get('model',''), _stor_raw(s), _stor_usable(s))
            for s in stors if _stor_raw(s) or _stor_usable(s)
        ]
        if _stor_chart_data:
            _snames = [str(n)[:18] for n, _, _ in _stor_chart_data]
            _raws   = [float(r) if r else 0 for _, r, _ in _stor_chart_data]
            _usables = [float(u) if u else 0 for _, _, u in _stor_chart_data]
            _sc = _drawing_grouped_bar(
                _snames, [_raws, _usables], 200, 65,
                ["#2E75B6", "#70AD47"], ["Raw (TB)", "Usable (TB)"],
                "Storage Capacity: Raw vs Usable (TB)"
            )
            if _sc:
                story.append(Spacer(1, 2*mm))
                story.append(_sc)
    except Exception:
        pass

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

    # Server Rooms
    server_rooms = (inv.server_rooms or []) if inv else []
    section_table(
        "VIII. SERVER ROOMS / DATA CENTER FACILITIES",
        ["#", "Tên phòng máy", "Địa điểm", "Loại", "Tier", "Diện tích (m²)",
         "Rack tổng/dùng", "Điện (kVA)", "UPS (kVA)", "Làm mát", "Trạng thái", "Ghi chú"],
        [[i+1, s.get("name",""), s.get("location",""), s.get("room_type",""),
          s.get("tier_level",""), s.get("total_area_sqm",""),
          f'{s.get("rack_count","")}/{s.get("rack_used","")}',
          s.get("power_capacity_kva",""), s.get("ups_capacity_kva",""),
          s.get("cooling_type",""), s.get("status",""), s.get("notes","")]
         for i, s in enumerate(server_rooms)],
        col_widths=[8*mm,35*mm,35*mm,28*mm,18*mm,18*mm,20*mm,18*mm,18*mm,28*mm,22*mm,None]
    )

    # WAN Links
    wan_links = (inv.wan_links or []) if inv else []
    section_table(
        "IX. WAN LINKS / SITE CONNECTIONS",
        ["#", "Site / Địa điểm", "ISP", "Loại kết nối", "Bandwidth (Mbps)",
         "Vai trò", "IP / Subnet", "SLA", "Hết hạn HĐ", "Trạng thái", "Ghi chú"],
        [[i+1, s.get("site_name",""), s.get("isp",""), s.get("link_type",""),
          s.get("bandwidth_mbps",""), s.get("role",""), s.get("ip_public",""),
          s.get("sla",""), s.get("contract_expiry",""), s.get("status",""), s.get("notes","")]
         for i, s in enumerate(wan_links)],
        col_widths=[8*mm,35*mm,30*mm,30*mm,22*mm,20*mm,30*mm,15*mm,20*mm,20*mm,None]
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
        ["Server Rooms",    str(len(server_rooms))],
        ["WAN Links",       str(len(wan_links))],
        ["Applications", str(len(apps))],
        ["TỔNG CỘNG", str(len(servers)+len(sans)+len(stors)+len(nets)+len(wifis)+len(tapes)+len(vms)+len(server_rooms)+len(wan_links)+len(apps))],
    ]
    sum_tbl = Table(summary_data, colWidths=[100*mm, 80*mm])
    sum_tbl.setStyle(_summary_tbl_style())
    story.append(sum_tbl)

    # Diagrams
    if include_diagrams:
        diagrams = db.query(models.CustomerDiagram).filter(
            models.CustomerDiagram.customer_id == customer_id
        ).order_by(models.CustomerDiagram.uploaded_at.asc()).all()

        renderable_diagrams = [d for d in diagrams if getattr(d, "content_type", None) != "image/svg+xml"]

        if renderable_diagrams:
            story.append(PageBreak())
            story.append(P("  DIAGRAMS / SƠ ĐỒ HẠ TẦNG", "section"))

            max_w = 240 * mm
            max_h = 160 * mm

            for d in renderable_diagrams:
                try:
                    img_data = base64.b64decode(d.data)
                    reader = ImageReader(io.BytesIO(img_data))
                    orig_w, orig_h = reader.getSize()
                    scale = min(max_w / max(orig_w, 1), max_h / max(orig_h, 1), 1.0)
                    final_w = orig_w * scale
                    final_h = orig_h * scale
                    if getattr(d, "label", None):
                        story.append(P(d.label, "body"))
                    img = Image(io.BytesIO(img_data), width=final_w, height=final_h)
                    story.append(img)
                except Exception:
                    story.append(P(f"[Image: {d.filename} — không thể hiển thị]", "body"))

    footer_cb = functools.partial(_page_footer, customer_name=c.name, report_type="Inventory Report")
    doc.build(story, onFirstPage=footer_cb, onLaterPages=footer_cb)
    buf.seek(0)
    return buf


# ── Sizing PDF ────────────────────────────────────────────────────────────────

def build_sizing_pdf(customer_id: int, db: Session, *, report_title=None, prepared_by=None,
                     department=None, custom_note=None) -> io.BytesIO:
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
    title_text = report_title if report_title else "INFRASTRUCTURE SIZING REPORT"
    story.append(P(title_text, "title"))
    story.append(P("Báo cáo Sizing Hạ tầng CNTT", "subtitle"))
    story.append(HR())

    info_rows = [
        ["Khách hàng:", c.name or ""], ["Dự án:", c.project_name or ""],
        ["Presales:", c.presales or ""], ["Ngày khảo sát:", c.survey_date or ""],
    ]
    if prepared_by:
        info_rows.append(["Người lập báo cáo:", prepared_by])
    if department:
        info_rows.append(["Phòng ban / Đơn vị:", department])
    info_rows.append(["Ngày xuất báo cáo:", datetime.now().strftime("%d/%m/%Y %H:%M")])

    info_tbl = Table([[P(r[0], "label"), P(r[1])] for r in info_rows], colWidths=[50*mm, 120*mm])
    info_tbl.setStyle(_kv_tbl_style())
    story.append(info_tbl)

    if custom_note:
        story.append(P(f"📝 Ghi chú: {custom_note}", "body"))

    def section_header(title):
        story.append(Spacer(1, 6*mm))
        story.append(P(f"  {title}", "section"))

    def kv_table(rows):
        data = [[P(r[0], "label"), P(str(r[1]) if r[1] is not None else "", "result" if len(r) > 2 else "body"),
                 P(r[2] if len(r) > 2 else "")] for r in rows]
        tbl = Table(data, colWidths=[80*mm, 40*mm, 60*mm])
        tbl.setStyle(_kv_tbl_style())
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

        # Compute sizing chart: vCPU and RAM (required vs capacity)
        try:
            _cc = _drawing_grouped_bar(
                ["vCPU (cores)", "RAM (GB)"],
                [
                    [int(comp['total_vcpu']),    int(comp['total_ram_gb'])],
                    [int(comp['pcpu_with_ha']),  int(comp['ram_with_ha_gb'])],
                ],
                175, 65,
                ["#C00000", "#0070C0"],
                ["Required", "Server Capacity (with HA)"],
                "Compute: Required vs Capacity"
            )
            if _cc:
                story.append(Spacer(1, 2*mm))
                story.append(_cc)
        except Exception:
            pass

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

        # Storage sizing chart
        try:
            _sc = _drawing_hbar([
                ("Usable (after dedup)", float(stor['usable_tb'])),
                ("Raw – RAID 5",         float(stor['raw_raid5_tb'])),
                ("Raw – RAID 6",         float(stor['raw_raid6_tb'])),
            ], 175, 55, "Storage Requirements (TB)", "#2E75B6")
            if _sc:
                story.append(Spacer(1, 2*mm))
                story.append(_sc)
        except Exception:
            pass

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

        # Backup sizing chart
        try:
            _bc = _drawing_hbar([
                ("Source Data",     float(bk_sz['total_source_tb'])),
                ("Full Backup",     float(bk_sz['full_backup_tb'])),
                ("After Dedup",     float(bk_sz['after_dedup_tb'])),
                ("Repo Needed",     float(bk_sz['repo_needed_tb'])),
            ], 175, 55, "Backup Sizing (TB)", "#7030A0")
            if _bc:
                story.append(Spacer(1, 2*mm))
                story.append(_bc)
        except Exception:
            pass

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
def export_inventory_pdf(
    customer_id: int,
    db: Session = Depends(get_db),
    report_title: Optional[str] = None,
    prepared_by: Optional[str] = None,
    department: Optional[str] = None,
    custom_note: Optional[str] = None,
    include_diagrams: bool = True,
):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    buf = build_inventory_pdf(
        customer_id, db,
        report_title=report_title,
        prepared_by=prepared_by,
        department=department,
        custom_note=custom_note,
        include_diagrams=include_diagrams,
    )
    fname = f"SVT_Inventory_{c.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": f"attachment; filename={fname}"})


@router.get("/sizing-pdf")
def export_sizing_pdf(
    customer_id: int,
    db: Session = Depends(get_db),
    report_title: Optional[str] = None,
    prepared_by: Optional[str] = None,
    department: Optional[str] = None,
    custom_note: Optional[str] = None,
):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    buf = build_sizing_pdf(
        customer_id, db,
        report_title=report_title,
        prepared_by=prepared_by,
        department=department,
        custom_note=custom_note,
    )
    fname = f"SVT_Sizing_{c.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": f"attachment; filename={fname}"})
