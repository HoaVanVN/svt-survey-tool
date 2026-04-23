import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { customers as api, exportApi } from '../api'

const EMPTY = { name: '', project_name: '', contact: '', email: '', phone: '', presales: '', survey_date: '', notes: '' }

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteModal({ customer, onConfirm, onCancel }) {
  const [step, setStep] = useState(1)  // 1 = info + download, 2 = type name confirm
  const [typedName, setTypedName] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    if (typedName.trim() !== customer.name.trim()) return
    setDeleting(true)
    try {
      await onConfirm()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-red-600">🗑️ Xóa khách hàng</h3>
          <p className="text-sm text-gray-600 mt-1">
            Tất cả dữ liệu khảo sát và inventory của{' '}
            <span className="font-semibold text-gray-900">{customer.name}</span>{' '}
            sẽ bị xóa vĩnh viễn.
          </p>
        </div>

        {step === 1 ? (
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-700 font-medium">
              Khuyến nghị: tải xuống bản sao lưu trước khi xóa.
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium transition-colors"
                onClick={() => exportApi.excel(customer.id, customer.name)}
              >
                ⬇️ Excel
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium transition-colors"
                onClick={() => exportApi.inventoryPdf(customer.id, customer.name)}
              >
                📄 PDF
              </button>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                className="flex-1 btn-secondary"
                onClick={onCancel}
              >Hủy</button>
              <button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                onClick={() => setStep(2)}
              >Tiếp tục xóa →</button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-700">
              Để xác nhận, hãy gõ tên khách hàng:{' '}
              <span className="font-mono font-semibold text-gray-900 bg-gray-100 px-1 rounded">{customer.name}</span>
            </p>
            <input
              type="text"
              className="form-input w-full"
              placeholder="Nhập tên khách hàng..."
              value={typedName}
              onChange={e => setTypedName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && typedName.trim() === customer.name.trim() && handleConfirm()}
              autoFocus
            />
            <div className="flex gap-2">
              <button className="flex-1 btn-secondary" onClick={() => setStep(1)}>← Quay lại</button>
              <button
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                disabled={typedName.trim() !== customer.name.trim() || deleting}
                onClick={handleConfirm}
              >
                {deleting ? '⏳ Đang xóa...' : '🗑️ Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CustomerList() {
  const [list, setList] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)  // customer object to delete

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

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(deleteTarget.id)
      setDeleteTarget(null)
      load()
      toast.success('Đã xóa khách hàng')
    } catch {
      toast.error('Lỗi khi xóa')
    }
  }

  return (
    <div className="space-y-6">
      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal
          customer={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

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
          🖥️ Inventory Tool – Kiểm kê thiết bị &amp; ứng dụng
        </span>
        <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded px-2 py-1">
          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
          📐 Sizing Tool – Khảo sát &amp; tính toán sizing
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
              <button
                onClick={() => setDeleteTarget(c)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 ml-2 transition-opacity text-xs mt-0.5"
                title="Xóa khách hàng"
              >✕</button>
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
