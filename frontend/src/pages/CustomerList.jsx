import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { customers as api } from '../api'

const EMPTY = { name: '', project_name: '', contact: '', email: '', phone: '', presales: '', survey_date: '', notes: '' }

export default function CustomerList() {
  const [list, setList] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () => api.list().then(r => setList(r.data)).catch(() => toast.error('Không thể tải danh sách'))

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.name.trim()) return toast.error('Tên khách hàng không được để trống')
    setSaving(true)
    try {
      await api.create(form)
      toast.success('Đã thêm khách hàng')
      setShowForm(false)
      setForm(EMPTY)
      load()
    } catch { toast.error('Lỗi khi tạo khách hàng') }
    finally { setSaving(false) }
  }

  const del = async (id, name) => {
    if (!confirm(`Xóa khách hàng "${name}"? Tất cả dữ liệu khảo sát sẽ bị xóa.`)) return
    try { await api.delete(id); load(); toast.success('Đã xóa') }
    catch { toast.error('Lỗi khi xóa') }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Danh sách Khách hàng</h1>
          <p className="text-sm text-gray-500 mt-1">{list.length} khách hàng</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Thêm khách hàng</button>
      </div>

      {/* Tool legend */}
      <div className="flex gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded px-2 py-1">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
          🖥️ Inventory Tool – Kiểm kê thiết bị & ứng dụng
        </span>
        <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded px-2 py-1">
          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
          📐 Sizing Tool – Khảo sát & tính toán sizing
        </span>
      </div>

      {/* New customer form */}
      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Thêm khách hàng mới</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              ['name', 'Tên khách hàng *', 'text'],
              ['project_name', 'Tên dự án', 'text'],
              ['contact', 'Người liên hệ', 'text'],
              ['email', 'Email', 'email'],
              ['phone', 'Điện thoại', 'text'],
              ['presales', 'Presales phụ trách', 'text'],
              ['survey_date', 'Ngày khảo sát', 'date'],
            ].map(([f, label, type]) => (
              <div key={f}>
                <label className="form-label">{label}</label>
                <input type={type} className="form-input" value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
              </div>
            ))}
            <div className="lg:col-span-3">
              <label className="form-label">Ghi chú</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
            <button className="btn-secondary" onClick={() => { setShowForm(false); setForm(EMPTY) }}>Hủy</button>
          </div>
        </div>
      )}

      {/* Customer cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map(c => (
          <div key={c.id} className="card hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base text-gray-900 truncate">{c.name}</p>
                {c.project_name && <p className="text-sm text-gray-500 truncate">📁 {c.project_name}</p>}
                <div className="mt-1.5 space-y-0.5 text-xs text-gray-400">
                  {c.contact && <p>👤 {c.contact}</p>}
                  {c.presales && <p>🧑‍💼 {c.presales}</p>}
                  {c.survey_date && <p>📅 {c.survey_date}</p>}
                </div>
              </div>
              <button onClick={() => del(c.id, c.name)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 ml-2 transition-opacity text-xs mt-0.5">✕</button>
            </div>

            {/* Two tool buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              <Link
                to={`/customers/${c.id}/inventory/servers`}
                className="flex flex-col items-center justify-center py-2.5 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 transition-colors text-center"
              >
                <span className="text-lg leading-none mb-0.5">🖥️</span>
                <span className="text-xs font-semibold">Inventory</span>
                <span className="text-[10px] text-blue-500">Kiểm kê thiết bị</span>
              </Link>
              <Link
                to={`/customers/${c.id}/sizing/workload`}
                className="flex flex-col items-center justify-center py-2.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition-colors text-center"
              >
                <span className="text-lg leading-none mb-0.5">📐</span>
                <span className="text-xs font-semibold">Sizing</span>
                <span className="text-[10px] text-emerald-500">Tính toán sizing</span>
              </Link>
            </div>
          </div>
        ))}
        {list.length === 0 && !showForm && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-lg">Chưa có khách hàng nào. Hãy thêm khách hàng đầu tiên!</p>
          </div>
        )}
      </div>
    </div>
  )
}
