import React, { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { inventory as api, exportApi } from '../../api'
import DonutChart from '../../components/DonutChart'
import { normalizeOS } from './VMInventory'
import { buildTierSummary, totalRawTb, totalUsableTb, tierColor } from '../../utils/storageUtils'
import ExportModal from '../../components/ExportModal'

// virtual_machines is intentionally excluded — VMs are tracked separately in ☁️ VM Inventory
const SECTION_LABELS = {
  servers:         { icon: '🖥️', label: 'Physical Servers' },
  san_switches:    { icon: '🔀', label: 'SAN Switches' },
  storage_systems: { icon: '💿', label: 'Storage Systems' },
  network_devices: { icon: '🌐', label: 'Network Devices' },
  wifi_aps:        { icon: '📶', label: 'WiFi Access Points' },
  tape_libraries:  { icon: '📼', label: 'Tape Libraries' },
  server_rooms:    { icon: '🏢', label: 'Server Rooms' },
  wan_links:       { icon: '🔗', label: 'WAN Links' },
  applications:    { icon: '📦', label: 'Applications' },
}

// Per-category field overrides for aggregation dashboards
// vendor: field to use as "vendor", null = skip from vendor dashboard
// location: field to use as "location"
const AGG_FIELDS = {
  wan_links:    { vendor: 'isp',   location: 'site_name' },
  server_rooms: { vendor: null,    location: 'location'  },
  applications: { vendor: 'vendor',location: 'environment' },
}

// Count actual devices — multiply rows by their Quantity (SL) field
function countDevices(items) {
  return (items || []).reduce((s, item) => s + (parseInt(item.qty) || 1), 0)
}

function parseEOS(val) {
  if (!val || !String(val).trim()) return null
  const s = String(val).trim()
  const parts = s.split('/')
  let year, month
  if (parts.length === 2) { month = parseInt(parts[0]) - 1; year = parseInt(parts[1]) }
  else { year = parseInt(parts[0]); month = 11 }
  if (isNaN(year)) return null
  return new Date(year, month, 1)
}

function supportStatus(item) {
  // wan_links use contract_expiry; all others use support_until / end_of_support / support_expiry
  const eosVal = item.support_until || item.end_of_support || item.support_expiry || item.contract_expiry
  const d = parseEOS(eosVal)
  if (!d) return 'unknown'
  return d < new Date() ? 'eos' : 'supported'
}

// ── Sort hook ─────────────────────────────────────────────────────────────────
function useSortTable() {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const toggle = (key) => {
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key }
      setSortDir('asc'); return key
    })
  }

  const sort = (items, getVal) => {
    if (!sortKey) return items
    return [...items].sort((a, b) => {
      const va = getVal ? getVal(a, sortKey) : (a[sortKey] ?? '')
      const vb = getVal ? getVal(b, sortKey) : (b[sortKey] ?? '')
      const na = parseFloat(String(va)), nb = parseFloat(String(vb))
      const cmp = (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '')
        ? (na - nb)
        : String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }

  return { sortKey, sortDir, toggle, sort }
}

// ── Sortable TH ───────────────────────────────────────────────────────────────
function SortTh({ label, colKey, sortKey, sortDir, onToggle, className = '', style }) {
  const active = sortKey === colKey
  return (
    <th
      className={`table-hdr cursor-pointer hover:bg-blue-700 select-none ${className}`}
      style={style}
      onClick={() => onToggle(colKey)}
      title="Click để sắp xếp"
    >
      <span className="flex items-center gap-0.5">
        <span className="flex-1">{label}</span>
        <span className={`text-[9px] ml-0.5 ${active ? 'text-yellow-300' : 'text-white/40'}`}>
          {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  )
}

// ── Per-category detail table ─────────────────────────────────────────────────
function CategoryDetailTable({ items }) {
  const { sortKey, sortDir, toggle, sort } = useSortTable()

  const getVal = (item, key) => {
    if (key === 'model')    return item.model || item.version || ''
    if (key === 'location') return item.location || item.environment || ''
    if (key === 'eos') {
      const d = parseEOS(item.support_until || item.end_of_support || item.support_expiry || item.contract_expiry)
      return d ? d.getTime() : 0
    }
    if (key === 'qty') return parseInt(item.qty) || 1
    return item[key] ?? ''
  }

  const sorted = useMemo(() => sort(items, getVal), [items, sortKey, sortDir])

  const th = (label, key, cls = '') => (
    <SortTh label={label} colKey={key} sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className={cls} />
  )

  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          <th className="table-hdr text-center w-8">#</th>
          {th('Tên', 'name')}
          {th('Model / Version', 'model')}
          {th('Vendor', 'vendor')}
          {th('SL', 'qty', 'text-center')}
          {th('Vị trí / Môi trường', 'location')}
          {th('End of Support', 'eos')}
          {th('Trạng thái', 'status')}
        </tr>
      </thead>
      <tbody>
        {sorted.map((item, i) => {
          const st = supportStatus(item)
          return (
            <tr key={i} className={st === 'eos' ? 'bg-red-50' : 'hover:bg-gray-50'}>
              <td className="table-cell text-center text-gray-400">{i + 1}</td>
              <td className="table-cell font-medium">{item.name || '-'}</td>
              <td className="table-cell">{item.model || item.version || '-'}</td>
              <td className="table-cell">{item.vendor || '-'}</td>
              <td className="table-cell text-center font-semibold">{parseInt(item.qty) || 1}</td>
              <td className="table-cell">{item.location || item.environment || '-'}</td>
              <td className={`table-cell font-medium ${st === 'eos' ? 'text-red-600' : st === 'supported' ? 'text-green-600' : 'text-gray-400'}`}>
                {item.support_until || item.end_of_support || item.support_expiry || '—'}
              </td>
              <td className="table-cell">
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  st === 'eos'           ? 'bg-red-100 text-red-700'    :
                  item.status === 'Using'   ? 'bg-green-100 text-green-700' :
                  item.status === 'Standby' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {st === 'eos' ? 'EOS' : (item.status || item.criticality || '-')}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── EOS warning table ─────────────────────────────────────────────────────────
function EOSTable({ summary }) {
  const { sortKey, sortDir, toggle, sort } = useSortTable()

  const allEOS = useMemo(() =>
    Object.entries(SECTION_LABELS).flatMap(([key, { icon, label }]) =>
      (summary[key] || [])
        .filter(item => supportStatus(item) === 'eos')
        .map(item => ({ ...item, _cat: `${icon} ${label}` }))
    ), [summary])

  const getVal = (item, key) => {
    if (key === 'cat')   return item._cat
    if (key === 'model') return item.model || item.version || ''
    if (key === 'eos') {
      const d = parseEOS(item.support_until || item.end_of_support || item.support_expiry || item.contract_expiry)
      return d ? d.getTime() : 0
    }
    if (key === 'qty') return parseInt(item.qty) || 1
    return item[key] ?? ''
  }

  const sorted = useMemo(() => sort(allEOS, getVal), [allEOS, sortKey, sortDir])

  const th = (label, key, cls = '') => (
    <SortTh label={label} colKey={key} sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className={cls} />
  )

  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          {th('Hạng mục', 'cat')}
          {th('Tên', 'name')}
          {th('Model / Phiên bản', 'model')}
          {th('Vendor', 'vendor')}
          {th('SL', 'qty', 'text-center')}
          {th('End of Support', 'eos')}
          <th className="table-hdr">Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((item, i) => (
          <tr key={i} className="bg-red-50">
            <td className="table-cell">{item._cat}</td>
            <td className="table-cell font-medium">{item.name || '-'}</td>
            <td className="table-cell">{item.model || item.version || '-'}</td>
            <td className="table-cell">{item.vendor || '-'}</td>
            <td className="table-cell text-center font-medium">{parseInt(item.qty) || 1}</td>
            <td className="table-cell text-red-600 font-medium">
              {item.support_until || item.end_of_support || item.support_expiry || item.contract_expiry}
            </td>
            <td className="table-cell">
              <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 font-medium">EOS</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Storage tier table ────────────────────────────────────────────────────────
function StorageTierTable({ tierEntries, tierRawTotal }) {
  const { sortKey, sortDir, toggle, sort } = useSortTable()

  const rows = useMemo(() =>
    tierEntries.map(([tier, v]) => ({ tier, ...v })),
    [tierEntries]
  )

  const getVal = (row, key) => {
    if (key === 'pct')  return tierRawTotal > 0 ? row.raw_tb / tierRawTotal * 100 : 0
    if (key === 'eff')  return row.raw_tb > 0 ? row.usable_tb / row.raw_tb * 100 : 0
    return row[key] ?? ''
  }

  const sorted = useMemo(() => sort(rows, getVal), [rows, sortKey, sortDir])

  const th = (label, key, cls = '') => (
    <SortTh label={label} colKey={key} sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className={cls} />
  )

  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          {th('Disk Tier', 'tier')}
          {th('# Entries', 'device_count', 'text-center')}
          {th('Raw (TB)', 'raw_tb', 'text-center')}
          {th('Usable (TB)', 'usable_tb', 'text-center')}
          {th('% Raw', 'pct', 'text-center')}
          <th className="table-hdr">Biểu đồ</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(({ tier, raw_tb, usable_tb, device_count }) => {
          const pct = tierRawTotal > 0 ? Math.round(raw_tb / tierRawTotal * 100) : 0
          const eff = raw_tb > 0 ? Math.round(usable_tb / raw_tb * 100) : 0
          return (
            <tr key={tier} className="hover:bg-gray-50">
              <td className="table-cell font-medium">
                <span className="inline-block w-2 h-2 rounded-full mr-1.5 shrink-0" style={{ background: tierColor(tier) }} />
                {tier}
              </td>
              <td className="table-cell text-center">{device_count}</td>
              <td className="table-cell text-center font-semibold">{raw_tb.toFixed(1)}</td>
              <td className="table-cell text-center text-green-700 font-semibold">{usable_tb.toFixed(1)}</td>
              <td className="table-cell text-center text-gray-500">{pct}%</td>
              <td className="table-cell" style={{ minWidth: 110 }}>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-400 w-9 text-right">Raw</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: tierColor(tier) }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-400 w-9 text-right">Usable</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-green-400" style={{ width: `${pct * eff / 100}%` }} />
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr className="bg-gray-50 font-semibold">
          <td className="table-cell" colSpan={2}>Tổng</td>
          <td className="table-cell text-center">{tierRawTotal.toFixed(1)} TB</td>
          <td className="table-cell text-center text-green-700">
            {tierEntries.reduce((s, [, v]) => s + v.usable_tb, 0).toFixed(1)} TB
          </td>
          <td className="table-cell text-center">100%</td>
          <td className="table-cell text-gray-400 text-[10px]">
            {tierRawTotal > 0 && `Eff: ${Math.round(tierEntries.reduce((s, [, v]) => s + v.usable_tb, 0) / tierRawTotal * 100)}%`}
          </td>
        </tr>
      </tfoot>
    </table>
  )
}

// ── Category badge color palette ─────────────────────────────────────────────
const CAT_COLORS = {
  'Physical Servers':   'bg-blue-100 text-blue-700',
  'SAN Switches':       'bg-purple-100 text-purple-700',
  'Storage Systems':    'bg-amber-100 text-amber-700',
  'Network Devices':    'bg-cyan-100 text-cyan-700',
  'WiFi Access Points': 'bg-green-100 text-green-700',
  'Applications':       'bg-orange-100 text-orange-700',
}

function CatBadges({ cats }) {
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(cats).map(([label, count]) => {
        const cls = CAT_COLORS[label] || 'bg-gray-100 text-gray-600'
        const icon = Object.values(SECTION_LABELS).find(v => v.label === label)?.icon || ''
        return (
          <span key={label} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`} title={label}>
            {icon} {count}
          </span>
        )
      })}
    </div>
  )
}

// ── Aggregation helpers ───────────────────────────────────────────────────────
// fieldKey: 'vendor' | 'location' — uses AGG_FIELDS overrides per category
function useAggregation(summary, fieldKey) {
  return useMemo(() => {
    const map = {}
    Object.entries(SECTION_LABELS).forEach(([catKey, { label }]) => {
      const override = AGG_FIELDS[catKey]
      const fKey = override && Object.prototype.hasOwnProperty.call(override, fieldKey)
        ? override[fieldKey]
        : fieldKey
      if (fKey === null) return  // skip this category for this aggregation
      ;(summary?.[catKey] || []).forEach(item => {
        const key = ((item[fKey] || item[fieldKey] || '') + '').trim() || 'Chưa xác định'
        const qty = parseInt(item.qty) || 1
        if (!map[key]) map[key] = { total: 0, cats: {} }
        map[key].total += qty
        map[key].cats[label] = (map[key].cats[label] || 0) + qty
      })
    })
    return Object.entries(map)
      .map(([key, { total, cats }]) => ({ key, total, cats }))
      .sort((a, b) => b.total - a.total)
  }, [summary])
}

// ── Vendor dashboard ──────────────────────────────────────────────────────────
function VendorDashboard({ summary }) {
  const { sortKey, sortDir, toggle, sort } = useSortTable()
  const data = useAggregation(summary, 'vendor')
  const grandTotal = data.reduce((s, r) => s + r.total, 0)
  const maxTotal   = Math.max(...data.map(r => r.total), 1)

  const getVal = (row, key) => {
    if (key === 'pct') return row.total / Math.max(grandTotal, 1) * 100
    return row[key] ?? ''
  }
  const sorted = useMemo(() => sort(data, getVal), [data, sortKey, sortDir])

  const th = (label, key, cls = '') => (
    <SortTh label={label} colKey={key} sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className={cls} />
  )

  if (!data.length) return null

  return (
    <div className="card">
      <h4 className="font-medium text-gray-700 mb-0.5">💼 Vendor Distribution</h4>
      <p className="text-xs text-gray-400 mb-3">
        {grandTotal.toLocaleString()} thiết bị &nbsp;·&nbsp; {data.length} vendor{data.length !== 1 ? 's' : ''}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="table-hdr text-center w-7">#</th>
              {th('Vendor', 'key')}
              {th('SL', 'total', 'text-center')}
              {th('% Share', 'pct', 'text-center')}
              <th className="table-hdr" style={{ minWidth: 110 }}>Biểu đồ</th>
              <th className="table-hdr">Hạng mục</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const pct    = grandTotal > 0 ? Math.round(row.total / grandTotal * 100) : 0
              const barPct = Math.round(row.total / maxTotal * 100)
              return (
                <tr key={row.key} className="hover:bg-gray-50">
                  <td className="table-cell text-center text-gray-400">{i + 1}</td>
                  <td className="table-cell font-medium">{row.key}</td>
                  <td className="table-cell text-center font-bold text-blue-700">{row.total}</td>
                  <td className="table-cell text-center text-gray-500">{pct}%</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${barPct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 w-7 text-right">{pct}%</span>
                    </div>
                  </td>
                  <td className="table-cell"><CatBadges cats={row.cats} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Location dashboard ────────────────────────────────────────────────────────
function LocationDashboard({ summary }) {
  const { sortKey, sortDir, toggle, sort } = useSortTable()
  // location for hardware; AGG_FIELDS overrides handle wan_links→site_name, apps→environment
  const data = useAggregation(summary, 'location')
  const grandTotal = data.reduce((s, r) => s + r.total, 0)
  const maxTotal   = Math.max(...data.map(r => r.total), 1)

  const getVal = (row, key) => {
    if (key === 'pct') return row.total / Math.max(grandTotal, 1) * 100
    return row[key] ?? ''
  }
  const sorted = useMemo(() => sort(data, getVal), [data, sortKey, sortDir])

  const th = (label, key, cls = '') => (
    <SortTh label={label} colKey={key} sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className={cls} />
  )

  if (!data.length) return null

  // choose bar colour: green for named locations, gray for "Chưa xác định"
  const barColor = (key) => key === 'Chưa xác định' ? 'bg-gray-300' : 'bg-emerald-400'

  return (
    <div className="card">
      <h4 className="font-medium text-gray-700 mb-0.5">📍 Location Distribution</h4>
      <p className="text-xs text-gray-400 mb-3">
        {grandTotal.toLocaleString()} thiết bị &nbsp;·&nbsp; {data.length} vị trí
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="table-hdr text-center w-7">#</th>
              {th('Vị trí / Môi trường', 'key')}
              {th('SL', 'total', 'text-center')}
              {th('% Share', 'pct', 'text-center')}
              <th className="table-hdr" style={{ minWidth: 110 }}>Biểu đồ</th>
              <th className="table-hdr">Hạng mục</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const pct    = grandTotal > 0 ? Math.round(row.total / grandTotal * 100) : 0
              const barPct = Math.round(row.total / maxTotal * 100)
              return (
                <tr key={row.key} className="hover:bg-gray-50">
                  <td className="table-cell text-center text-gray-400">{i + 1}</td>
                  <td className={`table-cell font-medium ${row.key === 'Chưa xác định' ? 'text-gray-400 italic' : ''}`}>
                    {row.key}
                  </td>
                  <td className="table-cell text-center font-bold text-emerald-700">{row.total}</td>
                  <td className="table-cell text-center text-gray-500">{pct}%</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className={`${barColor(row.key)} h-2 rounded-full`} style={{ width: `${barPct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 w-7 text-right">{pct}%</span>
                    </div>
                  </td>
                  <td className="table-cell"><CatBadges cats={row.cats} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── VM OS distribution table ──────────────────────────────────────────────────
function VMOSTable({ osDist, totalVMs, poweredOn, totalDisk }) {
  const { sortKey, sortDir, toggle, sort } = useSortTable()

  const getVal = (row, key) => {
    if (key === 'pct') return totalVMs > 0 ? row.count / totalVMs * 100 : 0
    return row[key] ?? ''
  }

  const sorted = useMemo(() => sort(osDist, getVal), [osDist, sortKey, sortDir])

  const th = (label, key, cls = '') => (
    <SortTh label={label} colKey={key} sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className={cls} />
  )

  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          <th className="table-hdr text-center w-8">#</th>
          {th('Hệ điều hành', 'os')}
          {th('Số VM', 'count', 'text-center')}
          {th('% Tổng', 'pct', 'text-center')}
          {th('Powered On', 'on', 'text-center')}
          <th className="table-hdr">Tỉ lệ</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, i) => {
          const pct = totalVMs > 0 ? Math.round(row.count / totalVMs * 100) : 0
          return (
            <tr key={row.os} className="hover:bg-gray-50">
              <td className="table-cell text-center text-gray-400">{i + 1}</td>
              <td className="table-cell font-medium">{row.os}</td>
              <td className="table-cell text-center font-semibold">{row.count}</td>
              <td className="table-cell text-center text-gray-500">{pct}%</td>
              <td className="table-cell text-center text-green-700">{row.on > 0 ? row.on : '—'}</td>
              <td className="table-cell" style={{ minWidth: 100 }}>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-gray-400 text-[10px] w-6 text-right">{pct}%</span>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr className="bg-gray-50 font-semibold">
          <td className="table-cell" colSpan={2}>Tổng</td>
          <td className="table-cell text-center">{totalVMs}</td>
          <td className="table-cell text-center">100%</td>
          <td className="table-cell text-center text-green-700">{poweredOn}</td>
          <td className="table-cell text-gray-400 text-[10px]">
            Disk: {totalDisk >= 1024 ? (totalDisk / 1024).toFixed(1) + ' TB' : totalDisk + ' GB'}
          </td>
        </tr>
      </tfoot>
    </table>
  )
}

// ── Server Rooms detail table ─────────────────────────────────────────────────
function ServerRoomsTable({ items }) {
  const { sortKey, sortDir, toggle, sort } = useSortTable()

  const getVal = (item, key) => {
    if (key === 'rack_util') {
      const total = parseInt(item.rack_count) || 0
      return total > 0 ? (parseInt(item.rack_used) || 0) / total * 100 : 0
    }
    if (key === 'power_capacity_kva' || key === 'ups_capacity_kva' || key === 'cooling_capacity_kw')
      return parseFloat(item[key]) || 0
    return item[key] ?? ''
  }

  const sorted = useMemo(() => sort(items, getVal), [items, sortKey, sortDir])

  const th = (label, key, cls = '') => (
    <SortTh label={label} colKey={key} sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className={cls} />
  )

  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          <th className="table-hdr text-center w-7">#</th>
          {th('Tên phòng máy', 'name')}
          {th('Địa điểm', 'location')}
          {th('Loại', 'room_type')}
          {th('Tier', 'tier_level', 'text-center')}
          {th('Rack (tổng/dùng)', 'rack_util', 'text-center')}
          {th('Điện (kVA)', 'power_capacity_kva', 'text-center')}
          {th('UPS (kVA)', 'ups_capacity_kva', 'text-center')}
          {th('Làm mát', 'cooling_type')}
          {th('Trạng thái', 'status')}
        </tr>
      </thead>
      <tbody>
        {sorted.map((item, i) => {
          const rTotal  = parseInt(item.rack_count) || 0
          const rUsed   = parseInt(item.rack_used)  || 0
          const rPct    = rTotal > 0 ? Math.round(rUsed / rTotal * 100) : null
          return (
            <tr key={i} className="hover:bg-gray-50">
              <td className="table-cell text-center text-gray-400">{i + 1}</td>
              <td className="table-cell font-medium">{item.name || '-'}</td>
              <td className="table-cell">{item.location || '-'}</td>
              <td className="table-cell">{item.room_type || '-'}</td>
              <td className="table-cell text-center">
                {item.tier_level ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">{item.tier_level}</span>
                ) : '—'}
              </td>
              <td className="table-cell text-center">
                {rTotal > 0 ? (
                  <div>
                    <span className="font-medium">{rUsed}/{rTotal}</span>
                    {rPct !== null && (
                      <div className="mt-0.5 w-16 mx-auto bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${rPct >= 90 ? 'bg-red-400' : rPct >= 70 ? 'bg-amber-400' : 'bg-green-400'}`}
                          style={{ width: `${rPct}%` }} />
                      </div>
                    )}
                  </div>
                ) : '—'}
              </td>
              <td className="table-cell text-center">{item.power_capacity_kva || '—'}</td>
              <td className="table-cell text-center">{item.ups_capacity_kva || '—'}</td>
              <td className="table-cell">{item.cooling_type || '—'}</td>
              <td className="table-cell">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  item.status === 'Active'         ? 'bg-green-100 text-green-700'  :
                  item.status === 'Planned'        ? 'bg-blue-100 text-blue-700'   :
                  item.status === 'Decommissioned' ? 'bg-red-100 text-red-700'     :
                  'bg-gray-100 text-gray-600'
                }`}>{item.status || '-'}</span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── WAN Links detail table ────────────────────────────────────────────────────
function WANLinksTable({ items }) {
  const { sortKey, sortDir, toggle, sort } = useSortTable()

  const getVal = (item, key) => {
    if (key === 'bandwidth_mbps') return parseFloat(item.bandwidth_mbps) || 0
    if (key === 'contract_expiry') {
      const d = parseEOS(item.contract_expiry)
      return d ? d.getTime() : 0
    }
    return item[key] ?? ''
  }

  const sorted = useMemo(() => sort(items, getVal), [items, sortKey, sortDir])

  const th = (label, key, cls = '') => (
    <SortTh label={label} colKey={key} sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className={cls} />
  )

  const roleColor = r => ({
    Primary:      'bg-blue-100 text-blue-700',
    Secondary:    'bg-purple-100 text-purple-700',
    Backup:       'bg-gray-100 text-gray-600',
    'Load Balance':'bg-cyan-100 text-cyan-700',
  }[r] || 'bg-gray-100 text-gray-600')

  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          <th className="table-hdr text-center w-7">#</th>
          {th('Site / Địa điểm', 'site_name')}
          {th('ISP', 'isp')}
          {th('Loại kết nối', 'link_type')}
          {th('Bandwidth (Mbps)', 'bandwidth_mbps', 'text-center')}
          {th('Vai trò', 'role', 'text-center')}
          {th('IP / Subnet', 'ip_public')}
          {th('SLA', 'sla', 'text-center')}
          {th('Hết hạn HĐ', 'contract_expiry', 'text-center')}
          {th('Trạng thái', 'status')}
        </tr>
      </thead>
      <tbody>
        {sorted.map((item, i) => {
          const expiry = parseEOS(item.contract_expiry)
          const isExpired = expiry && expiry < new Date()
          return (
            <tr key={i} className={isExpired ? 'bg-red-50' : 'hover:bg-gray-50'}>
              <td className="table-cell text-center text-gray-400">{i + 1}</td>
              <td className="table-cell font-medium">{item.site_name || '-'}</td>
              <td className="table-cell font-medium text-blue-700">{item.isp || '-'}</td>
              <td className="table-cell">{item.link_type || '-'}</td>
              <td className="table-cell text-center font-semibold">
                {item.bandwidth_mbps
                  ? (item.bandwidth_mbps >= 1000
                      ? `${(item.bandwidth_mbps / 1000).toFixed(1)} Gbps`
                      : `${item.bandwidth_mbps} Mbps`)
                  : '—'}
              </td>
              <td className="table-cell text-center">
                {item.role ? (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${roleColor(item.role)}`}>{item.role}</span>
                ) : '—'}
              </td>
              <td className="table-cell font-mono text-[10px]">{item.ip_public || '—'}</td>
              <td className="table-cell text-center">{item.sla || '—'}</td>
              <td className={`table-cell text-center font-medium ${isExpired ? 'text-red-600' : expiry ? 'text-green-600' : 'text-gray-400'}`}>
                {item.contract_expiry || '—'}
              </td>
              <td className="table-cell">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  item.status === 'Active'   ? 'bg-green-100 text-green-700' :
                  item.status === 'Inactive' ? 'bg-red-100 text-red-700'    :
                  item.status === 'Planned'  ? 'bg-blue-100 text-blue-700'  :
                  'bg-gray-100 text-gray-600'
                }`}>{item.status || '-'}</span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InventoryReport() {
  const { id } = useParams()
  const [summary, setSummary]         = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)

  useEffect(() => {
    api.getAll(id).then(r => setSummary(r.data)).catch(() => {})
  }, [id])

  // Total devices: sum of qty across all sections (excludes VMs)
  const total = summary
    ? Object.keys(SECTION_LABELS).reduce((s, k) => s + countDevices(summary[k]), 0)
    : 0

  // Support status breakdown — expand by qty
  const supportStats = { supported: 0, eos: 0, unknown: 0 }
  if (summary) {
    Object.keys(SECTION_LABELS).forEach(k => {
      ;(summary[k] || []).forEach(item => {
        const qty = parseInt(item.qty) || 1
        supportStats[supportStatus(item)] += qty
      })
    })
  }

  const chartData = [
    { label: 'Còn hỗ trợ',      value: supportStats.supported, color: '#22c55e' },
    { label: 'Hết hỗ trợ (EOS)', value: supportStats.eos,       color: '#ef4444' },
    { label: 'Chưa xác định',    value: supportStats.unknown,   color: '#d1d5db' },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-4">
      {showExportModal && (
        <ExportModal
          type="inventory"
          onExport={params => { exportApi.inventoryPdf(id, null, params); setShowExportModal(false) }}
          onClose={() => setShowExportModal(false)}
        />
      )}

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">📋 Inventory Report – Tổng kết</h3>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Category counts */}
          <div>
            <h4 className="text-sm font-semibold text-gray-600 mb-3">Theo hạng mục</h4>
            {summary ? (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(SECTION_LABELS).map(([key, { icon, label }]) => {
                  const rows = (summary[key] || []).length
                  const devices = countDevices(summary[key])
                  return (
                    <div key={key} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                      <div className="text-xl mb-1">{icon}</div>
                      <div className="text-lg font-bold text-gray-800">{devices}</div>
                      {devices !== rows && (
                        <div className="text-[10px] text-gray-400">{rows} dòng × SL</div>
                      )}
                      <div className="text-xs text-gray-500">{label}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">Đang tải...</div>
            )}
            <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100 mt-2">
              <div className="text-2xl font-bold text-blue-700">{total}</div>
              <div className="text-xs text-blue-600">Tổng thiết bị (theo SL)</div>
            </div>
          </div>

          {/* Support status donut chart */}
          <div>
            <h4 className="text-sm font-semibold text-gray-600 mb-3">Trạng thái hỗ trợ (End of Support)</h4>
            <div className="flex justify-center">
              <DonutChart data={chartData} size={200} label="thiết bị" />
            </div>
            {supportStats.eos > 0 && (
              <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-2 text-xs text-red-700 text-center">
                ⚠️ {supportStats.eos} thiết bị/ứng dụng đã hết hoặc sắp hết hỗ trợ
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn-secondary flex-1 text-sm" onClick={() => exportApi.excel(id)}>
            ⬇️ Export Excel
          </button>
          <button
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors flex-1 text-sm"
            onClick={() => setShowExportModal(true)}
          >
            📄 Export Inventory PDF
          </button>
        </div>
      </div>

      {/* Vendor & Location dashboards */}
      {summary && (
        <div className="grid md:grid-cols-2 gap-4">
          <VendorDashboard summary={summary} />
          <LocationDashboard summary={summary} />
        </div>
      )}

      {/* Storage capacity summary */}
      {summary && (summary.storage_systems || []).length > 0 && (() => {
        const devices     = summary.storage_systems || []
        const rawTotal    = totalRawTb(devices)
        const usableTotal = totalUsableTb(devices)
        const tierSummary = buildTierSummary(devices)
        const tierEntries = Object.entries(tierSummary).sort((a, b) => b[1].raw_tb - a[1].raw_tb)
        const tierRawTotal = tierEntries.reduce((s, [, v]) => s + v.raw_tb, 0)

        return (
          <div className="card">
            <h4 className="font-medium text-gray-700 mb-3">
              💿 Storage Capacity
              <span className="ml-2 text-gray-400 font-normal text-xs">
                {countDevices(devices)} thiết bị
              </span>
            </h4>

            {/* Totals */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Tổng Raw',    value: rawTotal,    unit: 'TB', color: 'text-blue-700',  bg: 'bg-blue-50',   border: 'border-blue-100' },
                { label: 'Tổng Usable', value: usableTotal, unit: 'TB', color: 'text-green-700', bg: 'bg-green-50',  border: 'border-green-100' },
                { label: 'Storage Eff.', value: rawTotal > 0 ? `${Math.round(usableTotal / rawTotal * 100)}%` : '—', unit: '', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
                { label: 'Tier types',  value: tierEntries.length || '—', unit: '', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-100' },
              ].map(s => (
                <div key={s.label} className={`rounded-lg p-3 text-center border ${s.bg} ${s.border}`}>
                  <div className={`text-xl font-bold ${s.color}`}>
                    {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                    {s.unit && <span className="text-sm font-normal ml-1">{s.unit}</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Per-tier breakdown — sortable */}
            {tierEntries.length > 0 && (
              <>
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phân bổ theo Disk Tier</h5>
                <div className="overflow-x-auto">
                  <StorageTierTable tierEntries={tierEntries} tierRawTotal={tierRawTotal} />
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* VM Inventory summary */}
      {summary && (summary.virtual_machines || []).length > 0 && (() => {
        const vms       = summary.virtual_machines || []
        const totalVMs  = vms.length
        const poweredOn = vms.filter(v => (v.power_state || '').toLowerCase() === 'on').length
        const poweredOff = totalVMs - poweredOn
        const totalVcpu = vms.reduce((s, v) => s + (parseInt(v.vcpu) || 0), 0)
        const totalRam  = vms.reduce((s, v) => s + (parseInt(v.ram_gb) || 0), 0)
        const totalDisk = vms.reduce((s, v) => s + (parseInt(v.disk_gb) || 0), 0)

        const osMap = {}, osOnMap = {}
        vms.forEach(v => {
          const os = v.os_type || normalizeOS(v.guest_os) || 'Unknown'
          osMap[os] = (osMap[os] || 0) + 1
          if ((v.power_state || '') === 'On') osOnMap[os] = (osOnMap[os] || 0) + 1
        })
        const osDist = Object.entries(osMap)
          .map(([os, count]) => ({ os, count, on: osOnMap[os] || 0 }))
          .sort((a, b) => b.count - a.count)

        return (
          <div className="card">
            <h4 className="font-medium text-gray-700 mb-3">
              ☁️ Virtual Machines
              <span className="ml-2 text-gray-400 font-normal text-xs">{totalVMs} VMs</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
              {[
                { label: 'Tổng VMs',      value: totalVMs,   color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-100' },
                { label: 'Powered On',    value: poweredOn,  color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-100' },
                { label: 'Powered Off',   value: poweredOff, color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-100' },
                { label: 'Total vCPU',    value: totalVcpu,  color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
                { label: 'Total RAM (GB)', value: totalRam,  color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-100' },
              ].map(s => (
                <div key={s.label} className={`rounded-lg p-3 text-center border ${s.bg} ${s.border}`}>
                  <div className={`text-xl font-bold ${s.color}`}>{s.value.toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phân bổ OS</h5>
            <div className="overflow-x-auto">
              <VMOSTable osDist={osDist} totalVMs={totalVMs} poweredOn={poweredOn} totalDisk={totalDisk} />
            </div>
          </div>
        )
      })()}

      {/* EOS warning table — sortable */}
      {summary && supportStats.eos > 0 && (
        <div className="card border-red-200">
          <h4 className="font-medium text-red-700 mb-3">⚠️ Thiết bị & Ứng dụng đã hết hỗ trợ</h4>
          <div className="overflow-x-auto">
            <EOSTable summary={summary} />
          </div>
        </div>
      )}

      {/* Per-category detail tables — each sortable independently */}
      {summary && Object.entries(SECTION_LABELS).map(([key, { icon, label }]) => {
        const items = summary[key] || []
        if (!items.length) return null
        const deviceCount = countDevices(items)
        return (
          <div key={key} className="card">
            <h4 className="font-medium text-gray-700 mb-3">
              {icon} {label}
              <span className="ml-2 text-gray-400 font-normal text-xs">
                {deviceCount} mục
                {deviceCount !== items.length && ` (${items.length} dòng × SL)`}
              </span>
              <span className="ml-2 text-[10px] text-gray-400 font-normal">— click tiêu đề cột để sắp xếp</span>
            </h4>
            <div className="overflow-x-auto">
              {key === 'server_rooms' ? (
                <ServerRoomsTable items={items} />
              ) : key === 'wan_links' ? (
                <WANLinksTable items={items} />
              ) : (
                <CategoryDetailTable items={items} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
