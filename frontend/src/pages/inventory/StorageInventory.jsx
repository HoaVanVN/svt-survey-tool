import React from 'react'
import CategoryPage from './CategoryPage'

const FIELDS = [
  { key: 'name', label: 'Tên thiết bị', type: 'text', width: 130 },
  { key: 'model', label: 'Model', type: 'text', width: 120 },
  { key: 'vendor', label: 'Vendor', type: 'text', width: 90 },
  { key: 'serial', label: 'Serial Number', type: 'text', width: 110 },
  { key: 'qty', label: 'SL', type: 'number', width: 55, default: 1 },
  { key: 'location', label: 'Vị trí', type: 'text', width: 90 },
  { key: 'storage_type', label: 'Loại', type: 'select', width: 100, options: ['All-Flash', 'Hybrid', 'HDD', 'NVMe', 'NAS', 'SAN', 'Other'] },
  { key: 'raw_capacity_tb', label: 'Raw (TB)', type: 'number', width: 80 },
  { key: 'usable_capacity_tb', label: 'Usable (TB)', type: 'number', width: 85 },
  { key: 'status', label: 'Trạng thái', type: 'select', width: 100, default: 'Using' },
  { key: 'notes', label: 'Ghi chú', type: 'text', width: 120 },
]

export default function StorageInventory() {
  return <CategoryPage title="💿 Storage Systems" category="storage_systems" fields={FIELDS} />
}
