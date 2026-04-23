import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { workload as api } from '../../api'

// ── Small reusable cards ──────────────────────────────────────────────────────
function StatCard({ label, value, unit = '', sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50   border-blue-200   text-blue-900',
    green:  'bg-green-50  border-green-200  text-green-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    gray:   'bg-gray-50   border-gray-200   text-gray-700',
  }
  return (
    <div className={`rounded-lg border p-3 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children, color = '#1d4ed8' }) {
  return (
    <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
      <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ background: color }} />
      {children}
    </h3>
  )
}

// ── Compare bar: current vs recommended ──────────────────────────────────────
function CompareBar({ label, current, recommended, unit }) {
  const max = Math.max(current, recommended) * 1.1 || 1
  const pCur  = Math.min((current      / max) * 100, 100)
  const pRec  = Math.min((recommended  / max) * 100, 100)
  const ratio = recommended > 0 ? (recommended / Math.max(current, 1)).toFixed(1) : '—'
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-gray-400">{ratio}× so với hiện tại</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-24 text-gray-500 text-right">Hiện tại</span>
          <div className="flex-1 bg-gray-100 rounded-full h-3">
            <div className="bg-blue-400 h-3 rounded-full transition-all" style={{ width: `${pCur}%` }} />
          </div>
          <span className="text-[10px] w-20 text-gray-700 font-medium">{current.toLocaleString()} {unit}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-24 text-gray-500 text-right">Đề xuất</span>
          <div className="flex-1 bg-gray-100 rounded-full h-3">
            <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${pRec}%` }} />
          </div>
          <span className="text-[10px] w-20 text-green-700 font-bold">{recommended.toLocaleString()} {unit}</span>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RefreshSizing() {
  const { id } = useParams()

  const [includePoweredOff,  setIncludePoweredOff]  = useState(false)
  const [includeNewWorkloads, setIncludeNewWorkloads] = useState(true)
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const fetchData = () => {
    setLoading(true)
    setError(null)
    api.refreshSizing(id, {
      include_powered_off:   includePoweredOff,
      include_new_workloads: includeNewWorkloads,
    })
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [id, includePoweredOff, includeNewWorkloads])

  const sz  = data?.sizing
  const vmi = data?.vm_inventory
  const nwl = data?.new_workload
  const sp  = data?.survey_params || {}
  const srv = data?.server_inventory || []

  // ── Existing server capacity from inventory ───────────────────────────────
  const existingCores = srv.reduce((s, sv) => {
    const sockets = parseInt(sv.cpu_sockets || sv.sockets || 0)
    const cores   = parseInt(sv.cores_per_socket || sv.cores || 0)
    const qty     = parseInt(sv.qty || 1)
    return s + (sockets * cores || parseInt(sv.total_cores || 0)) * qty
  }, 0)
  const existingRamGb = srv.reduce((s, sv) => {
    const ram = parseFloat(sv.ram_gb || sv.ram || 0)
    const qty = parseInt(sv.qty || 1)
    return s + ram * qty
  }, 0)

  // ── No VM inventory at all ─────────────────────────────────────────────────
  if (!loading && !error && vmi?.total === 0 && !sz) {
    return (
      <div className="card text-center py-16 text-gray-400">
        <p className="text-5xl mb-4">🗂️</p>
        <p className="font-semibold text-gray-600 mb-2">Chưa có dữ liệu VM Inventory</p>
        <p className="text-sm mb-4">
          Import RVTools hoặc thêm VM thủ công trong tab{' '}
          <Link to={`/customers/${id}/inventory/vms`} className="text-blue-600 hover:underline">☁️ Virtual Machines</Link>{' '}
          để sử dụng tính năng Sizing Refresh.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="card bg-emerald-50 border-emerald-200">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-emerald-800">🔄 Sizing Refresh</h2>
            <p className="text-sm text-emerald-700 mt-1">
              Tính toán hạ tầng mới để đáp ứng toàn bộ workload hiện tại (từ VM Inventory)
              cộng thêm workload mới (từ Workload Survey).
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={includePoweredOff}
                onChange={e => setIncludePoweredOff(e.target.checked)}
              />
              <span className="text-gray-700">Bao gồm VM powered-off</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={includeNewWorkloads}
                onChange={e => setIncludeNewWorkloads(e.target.checked)}
              />
              <span className="text-gray-700">Bao gồm workload mới (Workload Survey)</span>
            </label>
          </div>
        </div>
      </div>

      {loading && (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">⏳</p><p>Đang tính toán...</p>
        </div>
      )}

      {error && (
        <div className="card border-red-200 bg-red-50 text-red-700 py-8 text-center text-sm">
          ⚠️ {error}
          {error.includes('survey') && (
            <span> — <Link to={`/customers/${id}/sizing/workload`} className="underline">Tạo Workload Survey</Link> trước.</span>
          )}
        </div>
      )}

      {!loading && !error && data && sz && (
        <>
          {/* ── A. Sources summary ───────────────────────────────────────── */}
          <div className="card">
            <SectionTitle color="#0891b2">📊 A. Workload đầu vào</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Current VMs */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-sm font-semibold text-blue-800 mb-3">
                  ☁️ Hiện tại — VM Inventory
                  <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded ${includePoweredOff ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                    {includePoweredOff ? 'Tất cả VM' : 'Chỉ Powered-On'}
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ['VM đã bao gồm',  vmi.included,     ''],
                    ['VM powered-on',  vmi.powered_on,   ''],
                    ['VM powered-off', vmi.powered_off,  ''],
                    ['Total vCPU',     sz.current_vcpu,  'vCPUs'],
                    ['Total RAM',      sz.current_ram_gb,'GB'],
                    ['Total Disk',     Math.round(sz.current_disk_gb / 1024) || `${sz.current_disk_gb}`, sz.current_disk_gb >= 1024 ? 'TB' : 'GB'],
                  ].map(([l, v, u]) => (
                    <div key={l} className="flex justify-between">
                      <span className="text-gray-500">{l}</span>
                      <span className="font-semibold text-gray-800">{v} {u}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* New workloads */}
              <div className={`rounded-lg p-4 border ${includeNewWorkloads ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                <p className="text-sm font-semibold text-green-800 mb-3">
                  ➕ Workload mới — Workload Survey
                  {!data.has_survey && (
                    <span className="ml-2 text-xs text-orange-600 font-normal">
                      (Chưa có survey —{' '}
                      <Link to={`/customers/${id}/sizing/workload`} className="underline">tạo ngay</Link>)
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ['Workload groups', nwl.items,       ''],
                    ['Total vCPU',      nwl.total_vcpu,   'vCPUs'],
                    ['Total RAM',       nwl.total_ram_gb, 'GB'],
                  ].map(([l, v, u]) => (
                    <div key={l} className="flex justify-between">
                      <span className="text-gray-500">{l}</span>
                      <span className="font-semibold text-gray-800">{v} {u}</span>
                    </div>
                  ))}
                </div>
                {!includeNewWorkloads && (
                  <p className="text-xs text-gray-400 mt-2">Bị tắt — bật checkbox để bao gồm</p>
                )}
              </div>
            </div>

            {/* Combined totals */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <StatCard label="Total vCPU (combined)" value={sz.total_vcpu}   unit="vCPUs" color="blue" />
              <StatCard label="Total RAM (combined)"  value={sz.total_ram_gb}  unit="GB"   color="blue" />
              <StatCard label="Total Disk (combined)" value={`${(sz.total_disk_gb/1024).toFixed(1)}`} unit="TB" color="blue" />
            </div>
          </div>

          {/* ── B. Parameters ────────────────────────────────────────────── */}
          <div className="card">
            <SectionTitle color="#7c3aed">⚙️ B. Thông số sizing đang dùng</SectionTitle>
            {!data.has_survey && (
              <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                ⚠️ Chưa có Workload Survey — đang dùng giá trị mặc định.{' '}
                <Link to={`/customers/${id}/sizing/workload`} className="underline font-medium">Tạo Workload Survey</Link>{' '}
                để tuỳ chỉnh các thông số này.
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              {[
                ['Virt ratio (vCPU:pCPU)',      `${sp.virt_ratio        ?? 4}:1`],
                ['CPU Overhead',                 `${sp.cpu_overhead_pct  ?? 10}%`],
                ['RAM Overhead',                 `${sp.ram_overhead_pct  ?? 10}%`],
                ['HA Reserve',                   `${sp.ha_reserve_pct    ?? 25}%`],
                ['Growth (năm)',                 `${sp.growth_years      ?? 3} năm`],
                ['Tỉ lệ tăng trưởng',            `${sp.growth_rate       ?? 20}%/năm`],
                ['Dedup ratio',                  `${sp.dedup_ratio       ?? 2}x`],
                ['Server CPU',                   `${sp.cpu_sockets ?? 2} sockets × ${sp.cores_per_socket ?? 16} cores`],
                ['RAM/server',                   `${sp.ram_per_server_gb ?? 512} GB`],
              ].map(([l, v]) => (
                <div key={l} className="bg-gray-50 rounded p-2 border border-gray-100">
                  <p className="text-gray-500 mb-0.5">{l}</p>
                  <p className="font-semibold text-gray-800">{v}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Để thay đổi thông số, chỉnh trong{' '}
              <Link to={`/customers/${id}/sizing/workload`} className="text-blue-600 hover:underline">
                💻 Workload Survey → Phần C
              </Link>.
            </p>
          </div>

          {/* ── C. Compute Sizing Result ─────────────────────────────────── */}
          <div className="card">
            <SectionTitle color="#1d4ed8">🖥️ C. Kết quả Sizing — Compute</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard label="pCPU cores yêu cầu" value={sz.pcpu_with_ha}    unit="cores" color="orange" sub={`Pre-HA: ${sz.pcpu_pre_ha}`} />
              <StatCard label="RAM yêu cầu"        value={sz.ram_with_ha_gb}  unit="GB"    color="orange" sub={`Pre-HA: ${sz.ram_pre_ha_gb} GB`} />
              <StatCard label="Min nodes"           value={sz.ha_nodes}        unit="nodes" color="purple" sub="Sau HA (N+1)" />
              <StatCard label="⭐ Tổng servers đề xuất" value={sz.total_nodes} unit="nodes" color="green"
                sub={`${sz.cpu_per_server} cores, ${sz.ram_per_server_gb} GB/server`} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard label="Growth nodes"        value={sz.growth_nodes}         unit="nodes" color="purple" />
              <StatCard label="Total CPU capacity"  value={sz.total_cpu_capacity}   unit="cores" color="gray" />
              <StatCard label="Total RAM capacity"  value={sz.total_ram_capacity_gb} unit="GB"   color="gray" />
            </div>

            {/* Capacity validation */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>{['Thông số','Yêu cầu','Năng lực thiết kế','Trạng thái'].map(h =>
                    <th key={h} className="table-hdr">{h}</th>)}</tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="table-cell">Total pCPU cores</td>
                    <td className="table-cell font-medium">{sz.pcpu_with_ha} cores</td>
                    <td className="table-cell font-medium">{sz.total_cpu_capacity} cores</td>
                    <td className="table-cell"><span className="badge bg-green-100 text-green-700">✅ Đủ</span></td>
                  </tr>
                  <tr>
                    <td className="table-cell">Total RAM</td>
                    <td className="table-cell font-medium">{sz.ram_with_ha_gb} GB</td>
                    <td className="table-cell font-medium">{sz.total_ram_capacity_gb} GB</td>
                    <td className="table-cell"><span className="badge bg-green-100 text-green-700">✅ Đủ</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── D. Storage Sizing Result ─────────────────────────────────── */}
          <div className="card">
            <SectionTitle color="#059669">💿 D. Kết quả Sizing — Primary Storage</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total disk (combined)"  value={`${(sz.storage.total_disk_gb/1024).toFixed(1)}`} unit="TB" color="blue" />
              <StatCard label="Usable after dedup+growth" value={sz.storage.usable_tb}  unit="TB" color="purple" />
              <StatCard label="⭐ Raw needed (RAID 5)"  value={sz.storage.raw_raid5_tb} unit="TB" color="green" sub="75% efficiency" />
              <StatCard label="⭐ Raw needed (RAID 6)"  value={sz.storage.raw_raid6_tb} unit="TB" color="green" sub="66% efficiency" />
            </div>
          </div>

          {/* ── E. Comparison with current infrastructure ────────────────── */}
          {srv.length > 0 && (
            <div className="card">
              <SectionTitle color="#dc2626">📈 E. So sánh với hạ tầng hiện tại</SectionTitle>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <CompareBar
                    label="CPU Cores"
                    current={existingCores}
                    recommended={sz.total_cpu_capacity}
                    unit="cores"
                  />
                  <CompareBar
                    label="RAM"
                    current={Math.round(existingRamGb)}
                    recommended={sz.total_ram_capacity_gb}
                    unit="GB"
                  />
                </div>
                <div className="space-y-2 text-sm">
                  <h4 className="font-medium text-gray-700">Hạ tầng hiện tại ({srv.length} server model)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="table-hdr">Tên</th>
                          <th className="table-hdr">Model</th>
                          <th className="table-hdr text-center">SL</th>
                          <th className="table-hdr">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {srv.slice(0, 10).map((s, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="table-cell">{s.name || '-'}</td>
                            <td className="table-cell">{s.model || '-'}</td>
                            <td className="table-cell text-center">{s.qty || 1}</td>
                            <td className="table-cell">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                s.status === 'Using' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}>{s.status || '-'}</span>
                            </td>
                          </tr>
                        ))}
                        {srv.length > 10 && (
                          <tr><td colSpan={4} className="table-cell text-gray-400 text-center">… và {srv.length - 10} server nữa</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── F. BOM summary ───────────────────────────────────────────── */}
          <div className="card">
            <SectionTitle color="#374151">📋 F. Bill of Materials – Refresh Sizing</SectionTitle>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="font-medium">I. Compute / Server Nodes</span>
                <span className="font-bold text-blue-700">
                  {sz.total_nodes} nodes × ({sz.cpu_per_server} cores, {sz.ram_per_server_gb} GB RAM)
                </span>
              </div>
              <div className="flex justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                <span className="font-medium">II. Primary Storage (RAID 5)</span>
                <span className="font-bold text-green-700">{sz.storage.raw_raid5_tb} TB raw</span>
              </div>
              <div className="flex justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                <span className="font-medium">II. Primary Storage (RAID 6)</span>
                <span className="font-bold text-green-700">{sz.storage.raw_raid6_tb} TB raw</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 text-center">
              Bao gồm: {vmi.included} VMs hiện tại
              {includeNewWorkloads && nwl.items > 0 && ` + ${nwl.items} workload group mới`}
              {` · Tăng trưởng ${sp.growth_years ?? 3} năm @ ${sp.growth_rate ?? 20}%/năm`}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
