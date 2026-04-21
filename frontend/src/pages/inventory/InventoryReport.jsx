import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { inventory as api, exportApi } from '../../api'

const SECTION_LABELS = {
  servers: { icon: '🖥️', label: 'Physical Servers' },
  san_switches: { icon: '🔀', label: 'SAN Switches' },
  storage_systems: { icon: '💿', label: 'Storage Systems' },
  network_devices: { icon: '🌐', label: 'Network Devices' },
  wifi_aps: { icon: '📶', label: 'WiFi Access Points' },
  applications: { icon: '📦', label: 'Applications' },
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

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">📋 Inventory Report – Tổng kết</h3>

        {summary ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {Object.entries(SECTION_LABELS).map(([key, { icon, label }]) => (
              <div key={key} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-lg font-bold text-gray-800">{summary[key]?.length || 0}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">Đang tải dữ liệu...</div>
        )}

        <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100 mb-6">
          <div className="text-3xl font-bold text-blue-700">{total}</div>
          <div className="text-sm text-blue-600">Tổng cộng thiết bị & ứng dụng</div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className="btn-secondary flex-1 text-sm"
            onClick={() => exportApi.excel(id)}
          >
            ⬇️ Export Excel (Full Survey Report)
          </button>
          <button
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors flex-1 text-sm"
            onClick={() => exportApi.inventoryPdf(id)}
          >
            📄 Export Inventory PDF
          </button>
        </div>
      </div>

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
                    <th className="table-hdr">Tên thiết bị / Ứng dụng</th>
                    <th className="table-hdr">Model / Phiên bản</th>
                    <th className="table-hdr">Vendor</th>
                    <th className="table-hdr text-center">SL</th>
                    <th className="table-hdr">Vị trí / Môi trường</th>
                    <th className="table-hdr">Trạng thái</th>
                    <th className="table-hdr">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="table-cell text-center text-gray-400">{i + 1}</td>
                      <td className="table-cell font-medium">{item.name || '-'}</td>
                      <td className="table-cell">{item.model || item.version || '-'}</td>
                      <td className="table-cell">{item.vendor || '-'}</td>
                      <td className="table-cell text-center">{item.qty || 1}</td>
                      <td className="table-cell">{item.location || item.environment || '-'}</td>
                      <td className="table-cell">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          item.status === 'Using' ? 'bg-green-100 text-green-700' :
                          item.status === 'EOL' ? 'bg-red-100 text-red-700' :
                          item.status === 'Standby' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{item.status || item.criticality || '-'}</span>
                      </td>
                      <td className="table-cell text-gray-500">{item.notes || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
