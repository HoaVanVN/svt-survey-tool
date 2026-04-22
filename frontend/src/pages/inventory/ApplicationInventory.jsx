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
  { key: 'support_expiry', label: 'Hết HT (MM/YYYY)', type: 'eos', width: 100 },
  { key: 'status', label: 'Trạng thái', type: 'select', refType: 'device_statuses', width: 100, default: 'Using' },
  { key: 'notes', label: 'Ghi chú', type: 'text', width: 120 },
]

export default function ApplicationInventory() {
  const { id } = useParams()
  const refs = useRefs()
  const [apps, setApps] = useState([])
  const [saving, setSaving] = useState(false)

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

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">
          📦 Application Inventory
          <span className="text-gray-400 text-sm font-normal ml-2">({apps.length} ứng dụng)</span>
        </h3>
      </div>
      <InventoryTable fields={FIELDS} items={apps} onChange={setApps} refs={refs} />
      <div className="flex justify-end pt-2">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu Application Inventory'}
        </button>
      </div>
    </div>
  )
}
