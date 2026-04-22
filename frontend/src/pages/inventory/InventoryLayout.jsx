import React from 'react'
import { Outlet, NavLink, useParams } from 'react-router-dom'
import { exportApi } from '../../api'

const TABS = [
  { path: 'servers', label: '🖥️ Servers' },
  { path: 'san-switches', label: '🔀 SAN Switches' },
  { path: 'storage', label: '💿 Storage' },
  { path: 'network-devices', label: '🌐 Network' },
  { path: 'wifi', label: '📶 WiFi APs' },
  { path: 'vms', label: '☁️ Virtual Machines' },
  { path: 'applications', label: '📦 Applications' },
  { path: 'report', label: '📋 Báo cáo' },
  { path: 'rvtools-report', label: '📊 RVTools' },
]

export default function InventoryLayout() {
  const { id } = useParams()

  return (
    <div className="space-y-3">
      <div className="card !p-0 overflow-hidden">
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-semibold text-blue-800">🖥️ Inventory Tool</span>
          <div className="flex gap-2">
            <button
              className="btn-secondary text-xs"
              onClick={() => exportApi.excel(id)}
            >⬇️ Excel</button>
            <button
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded font-medium transition-colors"
              onClick={() => exportApi.inventoryPdf(id)}
            >📄 PDF</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <nav className="flex gap-0.5 px-2 pt-2 min-w-max">
            {TABS.map(t => (
              <NavLink
                key={t.path}
                to={`/customers/${id}/inventory/${t.path}`}
                className={({ isActive }) =>
                  `px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >{t.label}</NavLink>
            ))}
          </nav>
        </div>
      </div>
      <Outlet />
    </div>
  )
}
