import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { rvtools as rvtoolsApi } from '../../api'

function mibToGib(v) {
  const n = Number(v)
  return isNaN(n) ? 0 : Math.round(n / 1024 * 10) / 10
}
function mibToTb(v) {
  const n = Number(v)
  return isNaN(n) ? 0 : Math.round(n / 1024 / 1024 * 100) / 100
}
function fmtNum(v) {
  if (v === '' || v === null || v === undefined) return '—'
  return Number(v).toLocaleString()
}

function SummaryCard({ icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  }
  return (
    <div className={`border rounded-lg p-3 ${colors[color]}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium">{label}</div>
      {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
    </div>
  )
}

function PowerBadge({ state }) {
  const s = (state || '').toLowerCase()
  if (s === 'poweredon') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">● On</span>
  )
  if (s === 'poweredoff') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">● Off</span>
  )
  if (s === 'suspended') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">● Suspended</span>
  )
  return <span className="text-gray-400 text-xs">{state || '—'}</span>
}

function DataTable({ rows, columns, maxRows = 500 }) {
  const [page, setPage] = useState(0)
  const pageSize = 50
  const total = Math.min(rows.length, maxRows)
  const pages = Math.ceil(total / pageSize)
  const slice = rows.slice(page * pageSize, page * pageSize + pageSize)

  if (!rows.length) return <p className="text-sm text-gray-400 italic py-4 text-center">Không có dữ liệu</p>

  return (
    <div>
      {rows.length > maxRows && (
        <p className="text-xs text-amber-600 mb-2">
          ⚠️ Hiển thị {maxRows.toLocaleString()} / {rows.length.toLocaleString()} dòng
        </p>
      )}
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map(c => (
                <th key={c.key} className="px-2 py-1.5 text-left font-semibold text-gray-600 whitespace-nowrap"
                  style={c.width ? { minWidth: c.width } : {}}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columns.map(c => (
                  <td key={c.key} className="px-2 py-1 text-gray-700 whitespace-nowrap">
                    {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—') || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
          <button
            className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
            onClick={() => setPage(p => p - 1)} disabled={page === 0}
          >← Prev</button>
          <span>Trang {page + 1} / {pages} ({total.toLocaleString()} dòng)</span>
          <button
            className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
            onClick={() => setPage(p => p + 1)} disabled={page >= pages - 1}
          >Next →</button>
        </div>
      )}
    </div>
  )
}

function Section({ title, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card">
      <button
        className="w-full flex items-center justify-between text-left"
        onClick={() => setOpen(o => !o)}
      >
        <h3 className="font-semibold text-gray-800">
          {title}
          {count != null && (
            <span className="ml-2 text-sm text-gray-400 font-normal">({count.toLocaleString()} records)</span>
          )}
        </h3>
        <span className="text-gray-400">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}

/* ── Column definitions per sheet ── */

const VINFO_COLS = [
  { key: 'VM', label: 'VM Name', width: 150 },
  { key: 'Powerstate', label: 'Power', render: (v) => <PowerBadge state={v} /> },
  { key: 'CPUs', label: 'vCPU', width: 55 },
  { key: 'Memory', label: 'RAM (GiB)', render: (v) => mibToGib(v) },
  { key: 'Total disk capacity MiB', label: 'Disk (GiB)', render: (v) => mibToGib(v) },
  { key: 'OS according to VMware Tools', label: 'Guest OS', width: 200 },
  { key: 'Primary IP Address', label: 'IP Address', width: 130 },
  { key: 'Cluster', label: 'Cluster', width: 120 },
  { key: 'Host', label: 'Host', width: 140 },
  { key: 'Datacenter', label: 'Datacenter', width: 100 },
]

const VHOST_COLS = [
  { key: 'Host', label: 'Hostname', width: 150 },
  { key: 'Datacenter', label: 'Datacenter', width: 100 },
  { key: 'Cluster', label: 'Cluster', width: 120 },
  { key: 'CPU Model', label: 'CPU Model', width: 200 },
  { key: '# CPU', label: 'Sockets', width: 65 },
  { key: '# Cores', label: 'Cores', width: 60 },
  { key: '# Logical CPUs', label: 'Threads', width: 65 },
  { key: 'Memory Size MiB', label: 'RAM (GiB)', render: (v) => mibToGib(v) },
  { key: '# VMs', label: '# VMs', width: 55 },
  { key: 'ESXi Version', label: 'ESXi Version', width: 120 },
  { key: 'Connection State', label: 'State', width: 100 },
]

const VCLUSTER_COLS = [
  { key: 'Name', label: 'Cluster', width: 150 },
  { key: 'Datacenter', label: 'Datacenter', width: 100 },
  { key: '# Hosts', label: '# Hosts', width: 65 },
  { key: '# CPU', label: '# vCPU', width: 65 },
  { key: '# Cores', label: '# Cores', width: 65 },
  { key: 'Memory Size MiB', label: 'Total RAM (GiB)', render: (v) => mibToGib(v) },
  { key: 'HA Enabled', label: 'HA', width: 60 },
  { key: 'DRS Enabled', label: 'DRS', width: 60 },
  { key: 'DRS Default VM Behavior', label: 'DRS Mode', width: 120 },
  { key: '# VMs', label: '# VMs', width: 55 },
]

const VDATASTORE_COLS = [
  { key: 'Name', label: 'Datastore', width: 180 },
  { key: 'Type', label: 'Type', width: 70 },
  { key: 'Datacenter', label: 'Datacenter', width: 100 },
  { key: 'Capacity MiB', label: 'Capacity (GiB)', render: (v) => mibToGib(v) },
  { key: 'Free Space MiB', label: 'Free (GiB)', render: (v) => mibToGib(v) },
  {
    key: 'Free Space MiB',
    label: 'Used %',
    render: (v, row) => {
      const cap = Number(row['Capacity MiB'] || 0)
      const free = Number(v || 0)
      if (!cap) return '—'
      const pct = Math.round((cap - free) / cap * 100)
      const color = pct > 85 ? 'text-red-600' : pct > 70 ? 'text-orange-500' : 'text-green-600'
      return <span className={`font-medium ${color}`}>{pct}%</span>
    }
  },
  { key: '# VMs', label: '# VMs', width: 55 },
  { key: 'URL', label: 'URL', width: 200 },
]

const VSNAPSHOT_COLS = [
  { key: 'VM', label: 'VM Name', width: 150 },
  { key: 'Name', label: 'Snapshot Name', width: 150 },
  { key: 'Description', label: 'Description', width: 200 },
  { key: 'Created', label: 'Created', width: 150 },
  { key: 'Size MiB', label: 'Size (GiB)', render: (v) => mibToGib(v) },
  { key: 'Quiesced', label: 'Quiesced', width: 80 },
  { key: 'State', label: 'State', width: 80 },
  { key: 'Datacenter', label: 'Datacenter', width: 100 },
  { key: 'Cluster', label: 'Cluster', width: 120 },
]

const VHEALTH_COLS = [
  { key: 'VM', label: 'VM / Object', width: 180 },
  { key: 'Category', label: 'Category', width: 140 },
  { key: 'Object', label: 'Object', width: 200 },
  { key: 'Health', label: 'Health', width: 100, render: (v) => {
    const lower = (v || '').toLowerCase()
    if (lower.includes('error') || lower.includes('red')) return <span className="text-red-600 font-medium">{v}</span>
    if (lower.includes('warning') || lower.includes('yellow')) return <span className="text-yellow-600 font-medium">{v}</span>
    return <span>{v || '—'}</span>
  }},
  { key: 'Message', label: 'Message', width: 300 },
  { key: 'Datacenter', label: 'Datacenter', width: 100 },
  { key: 'Cluster', label: 'Cluster', width: 120 },
]

const VLICENSE_COLS = [
  { key: 'Product', label: 'Product', width: 200 },
  { key: 'Edition', label: 'Edition', width: 200 },
  { key: 'License Key', label: 'License Key', width: 200 },
  { key: 'Used', label: 'Used', width: 60 },
  { key: 'Total', label: 'Total', width: 60 },
  { key: 'Expiration Date', label: 'Expiration', width: 120 },
  { key: 'Datacenter', label: 'Datacenter', width: 100 },
]

/* ── filter rows that actually have data in first key column ── */
function filterRows(rows, key) {
  return rows.filter(r => r[key] !== '' && r[key] !== undefined)
}

export default function RVToolsReport() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    rvtoolsApi.get(id)
      .then(r => setData(r.data))
      .catch(() => setData({ exists: false }))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16 text-gray-400">
        <span>⏳ Đang tải dữ liệu RVTools...</span>
      </div>
    )
  }

  if (!data?.exists) {
    return (
      <div className="card text-center py-16 space-y-3">
        <div className="text-4xl">📊</div>
        <h3 className="font-semibold text-gray-700">Chưa có dữ liệu RVTools</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Vào tab <strong>☁️ Virtual Machines</strong> và nhấn nút{' '}
          <strong>📥 Import RVTools</strong> để tải file Excel từ RVTools.
        </p>
        <Link
          to={`/customers/${id}/inventory/vms`}
          className="inline-block btn-primary text-sm"
        >
          → Đi đến Virtual Machines
        </Link>
      </div>
    )
  }

  const s = data.summary || {}
  const vinfo = data.vinfo || []
  const vhost = data.vhost || []
  const vcluster = data.vcluster || []
  const vdatastore = data.vdatastore || []
  const vsnapshot = data.vsnapshot || []
  const vhealth = data.vhealth || []
  const vlicense = data.vlicense || []

  const totalDsCapGib = vdatastore.reduce((acc, r) => acc + Number(r['Capacity MiB'] || 0) / 1024, 0)
  const totalDsFreeGib = vdatastore.reduce((acc, r) => acc + Number(r['Free Space MiB'] || 0) / 1024, 0)
  const totalSnapshotGib = vsnapshot.reduce((acc, r) => acc + Number(r['Size MiB'] || 0) / 1024, 0)

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="card !py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">📊 RVTools Report</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Source: <span className="font-medium">{data.source_filename || '—'}</span>
              {data.imported_at && (
                <span className="ml-2">• Imported: {new Date(data.imported_at).toLocaleString()}</span>
              )}
            </p>
          </div>
          <Link
            to={`/customers/${id}/inventory/vms`}
            className="btn-secondary text-xs"
          >
            ☁️ VM Inventory
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <SummaryCard icon="🖥️" label="Total VMs" value={fmtNum(s.total_vms)} color="blue" />
        <SummaryCard icon="✅" label="Powered On" value={fmtNum(s.powered_on)} color="green" />
        <SummaryCard icon="🔴" label="Powered Off" value={fmtNum(s.powered_off)} color="red" />
        <SummaryCard icon="⚡" label="Total vCPU" value={fmtNum(s.total_vcpu)} color="purple" />
        <SummaryCard icon="💾" label="Total RAM" value={`${fmtNum(s.total_ram_gib)} GiB`} color="blue" />
        <SummaryCard icon="💿" label="Total Disk" value={`${s.total_disk_tb ?? 0} TB`} color="gray" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryCard icon="🗄️" label="ESXi Hosts" value={fmtNum(s.host_count ?? vhost.length)} color="blue" />
        <SummaryCard icon="🔗" label="Clusters" value={fmtNum(s.cluster_count ?? vcluster.length)} color="blue" />
        <SummaryCard
          icon="💿"
          label="Datastores"
          value={fmtNum(s.datastore_count ?? vdatastore.length)}
          sub={totalDsCapGib > 0 ? `${Math.round(totalDsCapGib)} GiB total` : undefined}
          color="blue"
        />
        <SummaryCard
          icon="📷"
          label="Snapshots"
          value={fmtNum(s.snapshot_count ?? vsnapshot.length)}
          sub={totalSnapshotGib > 0 ? `${Math.round(totalSnapshotGib)} GiB` : undefined}
          color="orange"
        />
      </div>
      {s.health_warning_count > 0 && (
        <div className="card !py-2 bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800 font-medium">
            ⚠️ {fmtNum(s.health_warning_count)} health warnings found in vHealth sheet
          </p>
        </div>
      )}

      {/* vInfo – VM List */}
      <Section title="🖥️ Virtual Machines" count={vinfo.length}>
        <DataTable rows={filterRows(vinfo, 'VM')} columns={VINFO_COLS} maxRows={1000} />
      </Section>

      {/* vHost */}
      <Section title="🗄️ ESXi Hosts" count={vhost.length}>
        <DataTable rows={filterRows(vhost, 'Host')} columns={VHOST_COLS} />
      </Section>

      {/* vCluster */}
      <Section title="🔗 Clusters" count={vcluster.length}>
        <DataTable rows={filterRows(vcluster, 'Name')} columns={VCLUSTER_COLS} />
      </Section>

      {/* vDatastore */}
      <Section title="💿 Datastores" count={vdatastore.length}>
        <DataTable rows={filterRows(vdatastore, 'Name')} columns={VDATASTORE_COLS} />
        {totalDsCapGib > 0 && (
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
            <span>Total capacity: <strong>{Math.round(totalDsCapGib).toLocaleString()} GiB</strong></span>
            <span>Used: <strong>{Math.round(totalDsCapGib - totalDsFreeGib).toLocaleString()} GiB</strong></span>
            <span>Free: <strong>{Math.round(totalDsFreeGib).toLocaleString()} GiB</strong></span>
            <span>Utilization: <strong>{totalDsCapGib > 0 ? Math.round((totalDsCapGib - totalDsFreeGib) / totalDsCapGib * 100) : 0}%</strong></span>
          </div>
        )}
      </Section>

      {/* vSnapshot */}
      <Section title="📷 Snapshots" count={vsnapshot.length} defaultOpen={false}>
        {totalSnapshotGib > 0 && (
          <p className="text-sm text-amber-700 mb-2 font-medium">
            ⚠️ Total snapshot size: {Math.round(totalSnapshotGib).toLocaleString()} GiB — consider cleanup
          </p>
        )}
        <DataTable rows={filterRows(vsnapshot, 'VM')} columns={VSNAPSHOT_COLS} maxRows={500} />
      </Section>

      {/* vHealth */}
      <Section title="🏥 Health Warnings" count={vhealth.length} defaultOpen={false}>
        <DataTable rows={vhealth} columns={VHEALTH_COLS} maxRows={500} />
      </Section>

      {/* vLicense */}
      <Section title="🔑 Licenses" count={vlicense.length} defaultOpen={false}>
        <DataTable rows={filterRows(vlicense, 'Product')} columns={VLICENSE_COLS} />
      </Section>
    </div>
  )
}
