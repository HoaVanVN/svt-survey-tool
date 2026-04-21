import React, { useEffect, useState } from 'react'
import { Outlet, NavLink, useParams, useNavigate, useLocation } from 'react-router-dom'
import { customers as api, exportApi } from '../api'
import toast from 'react-hot-toast'

export default function CustomerDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const location = useLocation()
  const [customer, setCustomer] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => {
    api.get(id).then(r => { setCustomer(r.data); setForm(r.data) })
      .catch(() => { toast.error('Không tìm thấy khách hàng'); nav('/customers') })
  }, [id])

  const save = async () => {
    try {
      const r = await api.update(id, form)
      setCustomer(r.data)
      setEditing(false)
      toast.success('Đã cập nhật')
    } catch {
      toast.error('Lỗi khi lưu')
    }
  }

  if (!customer) return <div className="flex items-center justify-center h-64 text-gray-400">Đang tải...</div>

  const isInventory = location.pathname.includes(`/customers/${id}/inventory`)
  const isSizing = location.pathname.includes(`/customers/${id}/sizing`)

  return (
    <div className="space-y-4">
      {/* Customer header */}
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
            <button className="btn-secondary text-xs" onClick={() => setEditing(true)}>✏️ Sửa</button>
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

      {/* Tool selector */}
      <div className="flex gap-3">
        <NavLink
          to={`/customers/${id}/inventory/servers`}
          className={`flex-1 text-center py-3 rounded-lg font-semibold text-sm transition-colors border-2 ${
            isInventory
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          🖥️ Inventory Tool
          <div className="text-xs font-normal opacity-75 mt-0.5">Kiểm kê thiết bị & ứng dụng</div>
        </NavLink>
        <NavLink
          to={`/customers/${id}/sizing/workload`}
          className={`flex-1 text-center py-3 rounded-lg font-semibold text-sm transition-colors border-2 ${
            isSizing
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-600'
          }`}
        >
          📐 Sizing Tool
          <div className="text-xs font-normal opacity-75 mt-0.5">Khảo sát & tính toán sizing</div>
        </NavLink>
      </div>

      {/* Tool content */}
      <Outlet />
    </div>
  )
}
