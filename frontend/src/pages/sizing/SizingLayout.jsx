import React from 'react'
import { Outlet, NavLink, useParams } from 'react-router-dom'
import { exportApi } from '../../api'

const TABS = [
  { path: 'workload', label: '💻 Workload Survey' },
  { path: 'network', label: '🌐 Network Survey' },
  { path: 'backup', label: '💾 Backup Survey' },
  { path: 'security', label: '🔒 Security Survey' },
  { path: 'ocp', label: '☸️ OCP Survey' },
  { path: 'ocp-virt', label: '🖥️ OCP Virt Sizing' },
  { path: 'storage', label: '💿 Storage Sizing' },
  { path: 'refresh', label: '🔄 Sizing Refresh' },
  { path: 'results', label: '📊 Sizing Results' },
  { path: 'report', label: '📋 Sizing Report' },
]

export default function SizingLayout() {
  const { id } = useParams()

  return (
    <div className="space-y-3">
      <div className="card !p-0 overflow-hidden">
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-semibold text-emerald-800">📐 Sizing Tool</span>
          <div className="flex gap-2">
            <button
              className="btn-secondary text-xs"
              onClick={() => exportApi.excel(id)}
            >⬇️ Excel</button>
            <button
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded font-medium transition-colors"
              onClick={() => exportApi.sizingPdf(id)}
            >📄 PDF</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <nav className="flex gap-0.5 px-2 pt-2 min-w-max">
            {TABS.map(t => (
              <NavLink
                key={t.path}
                to={`/customers/${id}/sizing/${t.path}`}
                className={({ isActive }) =>
                  `px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-emerald-600 text-emerald-700'
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
