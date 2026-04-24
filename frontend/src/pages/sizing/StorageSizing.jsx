import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { workload as wlApi, inventory as inventoryApi } from '../../api'
import { buildTierSummary, totalRawTb, totalUsableTb, tierColor } from '../../utils/storageUtils'

function StatCard({ label, value, unit = '', sub, color = 'blue', highlight = false }) {
  const colors = {
    blue:   'bg-blue-50   border-blue-200   text-blue-900',
    green:  'bg-green-50  border-green-200  text-green-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    gray:   'bg-gray-50   border-gray-200   text-gray-700',
  }
  return (
    <div className={`rounded-lg border p-3 ${colors[color]} ${highlight ? 'ring-2 ring-green-400' : ''}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">
        {typeof value === 'number' ? value.toLocaleString() : (value ?? '—')}
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

function CompareBar({ label, current, recommended, unit }) {
  const max = Math.max(current, recommended) * 1.1 || 1
  const pCur = Math.min((current / max) * 100, 100)
  const pRec = Math.min((recommended / max) * 100, 100)
  const ratio = current > 0 ? (recommended / current).toFixed(2) : '—'
  const enough = current >= recommended
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span className="font-medium">{label}</span>
        <span className={enough ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
          {enough ? `✅ Đủ (có ${current.toLocaleString()} / cần ${recommended.toLocaleString()} ${unit})` : `⚠️ Thiếu (có ${current.toLocaleString()} / cần ${recommended.toLocaleString()} ${unit})`}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-24 text-gray-500 text-right">Hiện có</span>
          <div className="flex-1 bg-gray-100 rounded-full h-3">
            <div className="bg-blue-400 h-3 rounded-full transition-all" style={{ width: `${pCur}%` }} />
          </div>
          <span className="text-[10px] w-20 text-gray-700 font-medium">{current.toLocaleString()} {unit}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-24 text-gray-500 text-right">Cần thiết</span>
          <div className="flex-1 bg-gray-100 rounded-full h-3">
            <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${pRec}%` }} />
          </div>
          <span className="text-[10px] w-20 text-green-700 font-bold">{recommended.toLocaleString()} {unit}</span>
        </div>
      </div>
    </div>
  )
}

export default function StorageSizing() {
  const { id } = useParams()
  const [survey, setSurvey]   = useState(null)
  const [sizing, setSizing]   = useState(null)
  const [storDevs, setStorDevs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      wlApi.get(id).catch(() => ({ data: null })),
      wlApi.sizing(id).catch(() => ({ data: null })),
      inventoryApi.getCategory(id, 'storage_systems').catch(() => ({ data: { items: [] } })),
    ]).then(([svRes, szRes, stRes]) => {
      setSurvey(svRes.data)
      setSizing(szRes.data)
      setStorDevs(stRes.data?.items || [])
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const st = sizing?.storage
  const sp = survey || {}

  // ── Current storage inventory summary ──────────────────────────────────────
  const currentRawTb    = totalRawTb(storDevs)
  const currentUsableTb = totalUsableTb(storDevs)
  const tierSummary     = buildTierSummary(storDevs)
  const tierEntries     = Object.entries(tierSummary)

  if (loading) {
    return (
      <div className="card text-center py-16 text-gray-400">
        <p className="text-3xl mb-2">⏳</p><p>Đang tải dữ liệu storage...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card border-red-200 bg-red-50 text-red-700 py-8 text-center text-sm">
        ⚠️ {error}
      </div>
    )
  }

  const hasSurvey = !!survey

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="card bg-amber-50 border-amber-200">
        <h2 className="text-lg font-bold text-amber-800">💿 Storage Sizing</h2>
        <p className="text-sm text-amber-700 mt-1">
          Tính toán dung lượng storage dựa trên Workload Survey (Phần C) và so sánh với Storage Inventory hiện tại.
        </p>
        {!hasSurvey && (
          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
            ⚠️ Chưa có Workload Survey — đang hiển thị kết quả với giá trị mặc định.{' '}
            <Link to={`/customers/${id}/sizing/workload`} className="underline font-medium">Tạo Workload Survey</Link>{' '}
            để nhập thông số storage thực tế (snapshot%, syslog%, dedup, growth).
          </div>
        )}
      </div>

      {/* ── A. Storage Survey Parameters ───────────────────────────────────── */}
      <div className="card">
        <SectionTitle color="#d97706">⚙️ A. Thông số Storage Survey</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {[
            ['Snapshot Reserve', `${sp.storage_snapshot_pct ?? 20}%`],
            ['Syslog / Log Reserve', `${sp.storage_syslog_pct ?? 5}%`],
            ['Dedup Ratio', `${sp.dedup_ratio ?? 2}x`],
            ['Growth (năm)', `${sp.growth_years ?? 3} năm`],
            ['Tỉ lệ tăng trưởng', `${sp.growth_rate ?? 20}%/năm`],
          ].map(([l, v]) => (
            <div key={l} className="bg-gray-50 rounded p-2 border border-gray-100">
              <p className="text-gray-500 mb-0.5">{l}</p>
              <p className="font-semibold text-gray-800">{v}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Chỉnh trong{' '}
          <Link to={`/customers/${id}/sizing/workload`} className="text-blue-600 hover:underline">
            💻 Workload Survey → Phần C
          </Link>.
        </p>
      </div>

      {/* ── B. Storage Sizing Results ───────────────────────────────────────── */}
      {st ? (
        <div className="card">
          <SectionTitle color="#0891b2">📊 B. Kết quả Sizing Storage</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <StatCard label="OS Storage"        value={st.total_os_gb   != null ? Math.round(st.total_os_gb / 1024 * 10) / 10 : null}   unit="TB" color="blue"   sub={`${st.total_os_gb ?? '—'} GB`} />
            <StatCard label="Data Storage"      value={st.total_data_gb != null ? Math.round(st.total_data_gb / 1024 * 10) / 10 : null} unit="TB" color="blue"   sub={`${st.total_data_gb ?? '—'} GB`} />
            <StatCard label="Tổng IOPS yêu cầu" value={st.total_iops}   unit="IOPS"   color="purple" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard label="Usable cần thiết"  value={st.usable_tb}      unit="TB" color="orange"  sub="Sau dedup, snapshot, growth" />
            <StatCard label="⭐ Raw cần (RAID 5)" value={st.raw_raid5_tb}  unit="TB" color="green"   highlight />
            <StatCard label="⭐ Raw cần (RAID 6)" value={st.raw_raid6_tb}  unit="TB" color="green"   highlight />
          </div>
        </div>
      ) : (
        <div className="card border-orange-200 bg-orange-50 text-orange-700 py-6 text-center text-sm">
          ⚠️ Chưa tính được kết quả sizing storage. Hãy{' '}
          <Link to={`/customers/${id}/sizing/workload`} className="underline">nhập Workload Survey</Link>{' '}
          với dữ liệu VM / workload.
        </div>
      )}

      {/* ── C. Current Storage Inventory ───────────────────────────────────── */}
      <div className="card">
        <SectionTitle color="#6b7280">🗄️ C. Storage Inventory hiện tại</SectionTitle>
        {storDevs.length === 0 ? (
          <div className="text-center text-gray-400 py-6 text-sm">
            Chưa có thiết bị storage nào trong Inventory.{' '}
            <Link to={`/customers/${id}/inventory/storage`} className="text-blue-600 hover:underline">
              Thêm vào Storage Inventory
            </Link>.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard label="Số thiết bị storage"  value={storDevs.length}       unit="devices"  color="gray" />
              <StatCard label="Tổng Raw Capacity"    value={currentRawTb}           unit="TB"        color="blue" />
              <StatCard label="Tổng Usable Capacity" value={currentUsableTb}        unit="TB"        color="green" />
              <StatCard label="Số tier lưu trữ"     value={tierEntries.length}     unit="tiers"     color="purple" />
            </div>

            {/* Per-tier breakdown */}
            {tierEntries.length > 0 && (
              <div className="mb-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {['Tier', 'Raw (TB)', 'Usable (TB)', '% Usable'].map(h =>
                        <th key={h} className="table-hdr">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {tierEntries.map(([tier, v]) => (
                      <tr key={tier} className="hover:bg-gray-50">
                        <td className="table-cell">
                          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: tierColor(tier) }} />
                          {tier}
                        </td>
                        <td className="table-cell text-right font-medium">{v.raw_tb}</td>
                        <td className="table-cell text-right font-medium text-green-700">{v.usable_tb}</td>
                        <td className="table-cell text-right text-gray-500">
                          {v.raw_tb > 0 ? `${Math.round(v.usable_tb / v.raw_tb * 100)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-semibold bg-gray-50 border-t-2 border-gray-300">
                      <td className="table-cell">Tổng</td>
                      <td className="table-cell text-right">{currentRawTb} TB</td>
                      <td className="table-cell text-right text-green-700">{currentUsableTb} TB</td>
                      <td className="table-cell text-right text-gray-500">
                        {currentRawTb > 0 ? `${Math.round(currentUsableTb / currentRawTb * 100)}%` : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── D. Gap Analysis (only if both sizing result and inventory exist) ── */}
      {st && storDevs.length > 0 && (
        <div className="card">
          <SectionTitle color="#16a34a">⚖️ D. So sánh: Inventory hiện tại vs. Sizing yêu cầu</SectionTitle>
          <div className="space-y-2 mb-4">
            <CompareBar
              label="Usable Storage"
              current={currentUsableTb}
              recommended={st.usable_tb ?? 0}
              unit="TB"
            />
            <CompareBar
              label="Raw Storage (RAID 5 basis)"
              current={currentRawTb}
              recommended={st.raw_raid5_tb ?? 0}
              unit="TB"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              ['Usable Gap', `${((st.usable_tb ?? 0) - currentUsableTb).toFixed(1)} TB`, (st.usable_tb ?? 0) <= currentUsableTb ? 'Đủ' : 'Thiếu — cần mở rộng', (st.usable_tb ?? 0) <= currentUsableTb],
              ['Raw Gap (R5)', `${((st.raw_raid5_tb ?? 0) - currentRawTb).toFixed(1)} TB`, (st.raw_raid5_tb ?? 0) <= currentRawTb ? 'Đủ' : 'Thiếu — cần mở rộng', (st.raw_raid5_tb ?? 0) <= currentRawTb],
              ['Raw Gap (R6)', `${((st.raw_raid6_tb ?? 0) - currentRawTb).toFixed(1)} TB`, (st.raw_raid6_tb ?? 0) <= currentRawTb ? 'Đủ' : 'Thiếu — cần mở rộng', (st.raw_raid6_tb ?? 0) <= currentRawTb],
              ['IOPS yêu cầu', `${(st.total_iops ?? 0).toLocaleString()} IOPS`, 'Xem Storage Vendor specs', null],
            ].map(([l, v, note, ok]) => (
              <div key={l} className={`rounded p-2 border text-xs ${ok === true ? 'bg-green-50 border-green-200' : ok === false ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
                <p className="text-gray-500 mb-0.5">{l}</p>
                <p className={`font-bold ${ok === true ? 'text-green-700' : ok === false ? 'text-orange-700' : 'text-gray-700'}`}>{v}</p>
                <p className="text-gray-400 mt-0.5">{note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
