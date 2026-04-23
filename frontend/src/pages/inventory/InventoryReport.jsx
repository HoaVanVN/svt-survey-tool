import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { inventory as api, exportApi } from '../../api'
import DonutChart from '../../components/DonutChart'
import { normalizeOS } from './VMInventory'
import { buildTierSummary, totalRawTb, totalUsableTb, tierColor } from '../../utils/storageUtils'

// virtual_machines is intentionally excluded — VMs are tracked separately in ☁️ VM Inventory
const SECTION_LABELS = {
  servers:         { icon: '🖥️', label: 'Physical Servers' },
  san_switches:    { icon: '🔀', label: 'SAN Switches' },
  storage_systems: { icon: '💿', label: 'Storage Systems' },
  network_devices: { icon: '🌐', label: 'Network Devices' },
  wifi_aps:        { icon: '📶', label: 'WiFi Access Points' },
  applications:    { icon: '📦', label: 'Applications' },
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
  const eosVal = item.support_until || item.end_of_support || item.support_expiry
  const d = parseEOS(eosVal)
  if (!d) return 'unknown'
  return d < new Date() ? 'eos' : 'supported'
}

export default function InventoryReport() {
  const { id } = useParams()
  const [summary, setSummary] = useState(null)

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
        const st = supportStatus(item)
        supportStats[st] += qty
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
            onClick={() => exportApi.inventoryPdf(id)}
          >
            📄 Export Inventory PDF
          </button>
        </div>
      </div>

      {/* Storage capacity summary */}
      {summary && (summary.storage_systems || []).length > 0 && (() => {
        const devices   = summary.storage_systems || []
        const rawTotal  = totalRawTb(devices)
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
                { label: 'Tổng Raw',    value: rawTotal,                  unit: 'TB', color: 'text-blue-700',  bg: 'bg-blue-50',   border: 'border-blue-100' },
                { label: 'Tổng Usable', value: usableTotal,               unit: 'TB', color: 'text-green-700', bg: 'bg-green-50',  border: 'border-green-100' },
                { label: 'RAID Eff.',   value: rawTotal > 0 ? `${Math.round(usableTotal / rawTotal * 100)}%` : '—', unit: '', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
                { label: 'Tier types',  value: tierEntries.length || '—', unit: '',   color: 'text-gray-700',  bg: 'bg-gray-50',   border: 'border-gray-100' },
              ].map(s => (
                <div key={s.label} className={`rounded-lg p-3 text-center border ${s.bg} ${s.border}`}>
                  <div className={`text-xl font-bold ${s.color}`}>{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}{s.unit && <span className="text-sm font-normal ml-1">{s.unit}</span>}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Per-tier breakdown */}
            {tierEntries.length > 0 && (
              <>
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phân bổ theo Disk Tier</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="table-hdr">Disk Tier</th>
                        <th className="table-hdr text-center"># Entries</th>
                        <th className="table-hdr text-center">Raw (TB)</th>
                        <th className="table-hdr text-center">Usable (TB)</th>
                        <th className="table-hdr text-center">% Raw</th>
                        <th className="table-hdr">Biểu đồ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tierEntries.map(([tier, { raw_tb, usable_tb, device_count }]) => {
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
                          {tierRawTotal > 0 && `Eff: ${Math.round(tierEntries.reduce((s,[,v]) => s + v.usable_tb, 0) / tierRawTotal * 100)}%`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* VM Inventory summary */}
      {summary && (summary.virtual_machines || []).length > 0 && (() => {
        const vms = summary.virtual_machines || []
        const totalVMs  = vms.length
        const poweredOn = vms.filter(v => (v.power_state || '').toLowerCase() === 'on' || (v.power_state || '') === 'On').length
        const poweredOff = totalVMs - poweredOn
        const totalVcpu = vms.reduce((s, v) => s + (parseInt(v.vcpu) || 0), 0)
        const totalRam  = vms.reduce((s, v) => s + (parseInt(v.ram_gb) || 0), 0)
        const totalDisk = vms.reduce((s, v) => s + (parseInt(v.disk_gb) || 0), 0)

        // Group by os_type (fallback: normalizeOS(guest_os))
        const osMap = {}
        const osOnMap = {}
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

            {/* VM stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
              {[
                { label: 'Tổng VMs',    value: totalVMs,  color: 'text-blue-700',  bg: 'bg-blue-50',   border: 'border-blue-100' },
                { label: 'Powered On',  value: poweredOn, color: 'text-green-700', bg: 'bg-green-50',  border: 'border-green-100' },
                { label: 'Powered Off', value: poweredOff,color: 'text-gray-600',  bg: 'bg-gray-50',   border: 'border-gray-100' },
                { label: 'Total vCPU',  value: totalVcpu, color: 'text-purple-700',bg: 'bg-purple-50', border: 'border-purple-100' },
                { label: 'Total RAM (GB)', value: totalRam, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-100' },
              ].map(s => (
                <div key={s.label} className={`rounded-lg p-3 text-center border ${s.bg} ${s.border}`}>
                  <div className={`text-xl font-bold ${s.color}`}>{s.value.toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* OS distribution table */}
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phân bổ OS</h5>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="table-hdr text-center w-8">#</th>
                    <th className="table-hdr">Hệ điều hành</th>
                    <th className="table-hdr text-center">Số VM</th>
                    <th className="table-hdr text-center">% Tổng</th>
                    <th className="table-hdr text-center">Powered On</th>
                    <th className="table-hdr">Tỉ lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {osDist.map((row, i) => {
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
                              <div
                                className="bg-blue-400 h-1.5 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
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
            </div>
          </div>
        )
      })()}

      {/* EOS warning table */}
      {summary && supportStats.eos > 0 && (
        <div className="card border-red-200">
          <h4 className="font-medium text-red-700 mb-3">⚠️ Thiết bị & Ứng dụng đã hết hỗ trợ</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="table-hdr">Hạng mục</th>
                  <th className="table-hdr">Tên</th>
                  <th className="table-hdr">Model / Phiên bản</th>
                  <th className="table-hdr">Vendor</th>
                  <th className="table-hdr text-center">SL</th>
                  <th className="table-hdr">End of Support</th>
                  <th className="table-hdr">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(SECTION_LABELS).flatMap(([key, { icon, label }]) =>
                  (summary[key] || [])
                    .filter(item => supportStatus(item) === 'eos')
                    .map((item, i) => (
                      <tr key={`${key}-${i}`} className="bg-red-50">
                        <td className="table-cell">{icon} {label}</td>
                        <td className="table-cell font-medium">{item.name || '-'}</td>
                        <td className="table-cell">{item.model || item.version || '-'}</td>
                        <td className="table-cell">{item.vendor || '-'}</td>
                        <td className="table-cell text-center font-medium">{parseInt(item.qty) || 1}</td>
                        <td className="table-cell text-red-600 font-medium">{item.support_until || item.end_of_support || item.support_expiry}</td>
                        <td className="table-cell">
                          <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 font-medium">EOS</span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-category detail tables */}
      {summary && Object.entries(SECTION_LABELS).map(([key, { icon, label }]) => {
        const items = summary[key] || []
        if (!items.length) return null
        const deviceCount = countDevices(items)
        return (
          <div key={key} className="card">
            <h4 className="font-medium text-gray-700 mb-3">
              {icon} {label}
              <span className="ml-2 text-gray-400 font-normal text-xs">
                {deviceCount} thiết bị
                {deviceCount !== items.length && ` (${items.length} dòng × SL)`}
              </span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="table-hdr text-center w-8">#</th>
                    <th className="table-hdr">Tên</th>
                    <th className="table-hdr">Model / Version</th>
                    <th className="table-hdr">Vendor</th>
                    <th className="table-hdr text-center">SL</th>
                    <th className="table-hdr">Vị trí / Môi trường</th>
                    <th className="table-hdr">End of Support</th>
                    <th className="table-hdr">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
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
            </div>
          </div>
        )
      })}
    </div>
  )
}
