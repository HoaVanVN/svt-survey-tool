import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { inventory as api, exportApi } from '../../api'
import DonutChart from '../../components/DonutChart'

const SECTION_LABELS = {
  servers: { icon: '🖥️', label: 'Physical Servers' },
  san_switches: { icon: '🔀', label: 'SAN Switches' },
  storage_systems: { icon: '💿', label: 'Storage Systems' },
  network_devices: { icon: '🌐', label: 'Network Devices' },
  wifi_aps: { icon: '📶', label: 'WiFi Access Points' },
  virtual_machines: { icon: '☁️', label: 'Virtual Machines' },
  applications: { icon: '📦', label: 'Applications' },
}

function parseEOS(val) {
  if (!val || !String(val).trim()) return null
  const s = String(val).trim()
  const parts = s.split('/')
  let year, month
  if (parts.length === 2) {
    month = parseInt(parts[0]) - 1
    year = parseInt(parts[1])
  } else {
    year = parseInt(parts[0])
    month = 11
  }
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

  const total = summary
    ? Object.values(summary).reduce((s, arr) => s + (arr?.length || 0), 0)
    : 0

  // Support status breakdown
  const supportStats = { supported: 0, eos: 0, unknown: 0 }
  if (summary) {
    Object.values(summary).forEach(arr => {
      (arr || []).forEach(item => {
        supportStats[supportStatus(item)]++
      })
    })
  }

  const chartData = [
    { label: 'Còn hỗ trợ', value: supportStats.supported, color: '#22c55e' },
    { label: 'Hết hỗ trợ (EOS)', value: supportStats.eos, color: '#ef4444' },
    { label: 'Chưa xác định', value: supportStats.unknown, color: '#d1d5db' },
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
                {Object.entries(SECTION_LABELS).map(([key, { icon, label }]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                    <div className="text-xl mb-1">{icon}</div>
                    <div className="text-lg font-bold text-gray-800">{summary[key]?.length || 0}</div>
                    <div className="text-xs text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">Đang tải...</div>
            )}
            <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100 mt-2">
              <div className="text-2xl font-bold text-blue-700">{total}</div>
              <div className="text-xs text-blue-600">Tổng cộng</div>
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
        return (
          <div key={key} className="card">
            <h4 className="font-medium text-gray-700 mb-3">{icon} {label} ({items.length})</h4>
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
                        <td className="table-cell text-center">{item.qty || 1}</td>
                        <td className="table-cell">{item.location || item.environment || '-'}</td>
                        <td className={`table-cell font-medium ${st === 'eos' ? 'text-red-600' : st === 'supported' ? 'text-green-600' : 'text-gray-400'}`}>
                          {item.support_until || item.end_of_support || item.support_expiry || '—'}
                        </td>
                        <td className="table-cell">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            st === 'eos' ? 'bg-red-100 text-red-700' :
                            item.status === 'Using' ? 'bg-green-100 text-green-700' :
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
