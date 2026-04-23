import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { inventory as api } from '../../api'
import { useRefs } from '../../hooks/useRefs'
import InventoryTable from '../../components/InventoryTable'

const FIELDS = [
  { key: 'name', label: 'Tên ứng dụng', type: 'text', width: 140 },
  { key: 'version', label: 'Phiên bản', type: 'text', width: 80 },
  { key: 'vendor', label: 'Vendor', type: 'select', refType: 'vendors', width: 100 },
  { key: 'app_type', label: 'Loại', type: 'select', refType: 'app_types', width: 110 },
  { key: 'environment', label: 'Môi trường', type: 'select', refType: 'environments', width: 100 },
  { key: 'servers', label: 'Server/Host', type: 'text', width: 120 },
  { key: 'database', label: 'Database', type: 'text', width: 100 },
  { key: 'os', label: 'OS', type: 'select', refType: 'os_list', width: 150 },
  { key: 'criticality', label: 'Criticality', type: 'select', refType: 'criticality_levels', width: 90 },
  { key: 'support_until', label: 'Support Until', type: 'eos', width: 95 },
  { key: 'status', label: 'Trạng thái', type: 'select', refType: 'device_statuses', width: 100, default: 'Using' },
  { key: 'notes', label: 'Ghi chú', type: 'text', width: 120 },
]

export default function ApplicationInventory() {
  const { id } = useParams()
  const refs = useRefs()
  const [apps, setApps] = useState([])
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    api.getApplications(id)
      .then(r => setApps(r.data.applications || []))
      .catch(() => setApps([]))
  }, [id])

  const save = async () => {
    setSaving(true)
    try {
      await api.saveApplications(id, apps)
      toast.success('Đã lưu Application Inventory')
    } catch {
      toast.error('Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  const clearAll = async () => {
    if (apps.length === 0) return
    if (!window.confirm(`Xóa tất cả ${apps.length} ứng dụng?\nDữ liệu sẽ bị xóa và lưu ngay lập tức.`)) return
    setClearing(true)
    try {
      setApps([])
      await api.saveApplications(id, [])
      toast.success('Đã xóa tất cả Application Inventory')
    } catch {
      toast.error('Lỗi khi xóa')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">
          📦 Application Inventory
          <span className="text-gray-400 text-sm font-normal ml-2">({apps.length} ứng dụng)</span>
        </h3>
      </div>
      <InventoryTable fields={FIELDS} items={apps} onChange={setApps} refs={refs} />
      <div className="flex justify-between pt-2">
        <button
          className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={clearAll}
          disabled={apps.length === 0 || clearing || saving}
        >
          {clearing ? '⏳ Đang xóa...' : '🗑️ Xóa tất cả'}
        </button>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu Application Inventory'}
        </button>
      </div>
    </div>
  )
}
