import React, { useEffect, useState } from 'react'
import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom'
import { customers as api, exportApi } from '../api'
import toast from 'react-hot-toast'

const TABS = [
  { path: 'workload', label: '💻 Workload', title: 'Workload Survey' },
  { path: 'network', label: '🌐 Network', title: 'Network & Infra' },
  { path: 'backup', label: '💾 Backup', title: 'Backup Survey' },
  { path: 'inventory', label: '🖥️ Inventory', title: 'Physical Inventory' },
  { path: 'security', label: '🔒 Security', title: 'Security' },
  { path: 'ocp', label: '☸️ OCP', title: 'OpenShift Sizing' },
  { path: 'sizing', label: '📊 Kết quả Sizing', title: 'Sizing Results' },
]

export default function CustomerDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => {
    api.get(id).then(r => { setCustomer(r.data); setForm(r.data) }).catch(() => { toast.error('Không tìm thấy khách hàng'); nav('/customers') })
  }, [id])

  const save = async () => {
    try { const r = await api.update(id, form); setCustomer(r.data); setEditing(false); toast.success('Đã cập nhật') }
    catch { toast.error('Lỗi khi lưu') }
  }

  if (!customer) return <div className="flex items-center justify-center h-64 text-gray-400">Đang tải...</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card">
        {!editing ? (
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-600">
                {customer.project_name && <span>📁 {customer.project_name}</span>}
                {customer.contact && <span>👤 {customer.contact}</span>}
                {customer.email && <span>✉️ {customer.email}</span>}
                {customer.presales && <span>🧑‍💼 {customer.presales}</span>}
                {customer.survey_date && <span>📅 {customer.survey_date}</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button className="btn-secondary text-xs" onClick={() => setEditing(true)}>✏️ Sửa</button>
              <button className="btn-success text-xs" onClick={() => exportApi.excel(id, customer.name)}>
                ⬇️ Export Excel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {['name', 'project_name', 'contact', 'email', 'phone', 'presales', 'survey_date'].map(f => (
                <div key={f}>
                  <label className="form-label capitalize">{f.replace('_', ' ')}</label>
                  <input className="form-input" value={form[f] || ''} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="btn-primary text-sm" onClick={save}>Lưu</button>
              <button className="btn-secondary text-sm" onClick={() => setEditing(false)}>Hủy</button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {TABS.map(t => (
            <NavLink
              key={t.path}
              to={`/customers/${id}/${t.path}`}
              className={({ isActive }) =>
                `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`
              }
            >{t.label}</NavLink>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <Outlet />
    </div>
  )
}
