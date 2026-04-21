import React from 'react'
import CategoryPage from './CategoryPage'

const FIELDS = [
  { key: 'name', label: 'Tên thiết bị', type: 'text', width: 130 },
  { key: 'model', label: 'Model', type: 'text', width: 120 },
  { key: 'vendor', label: 'Vendor', type: 'text', width: 90 },
  { key: 'serial', label: 'Serial Number', type: 'text', width: 110 },
  { key: 'qty', label: 'SL', type: 'number', width: 55, default: 1 },
  { key: 'location', label: 'Vị trí', type: 'text', width: 90 },
  { key: 'ports', label: 'Số port', type: 'number', width: 70 },
  { key: 'speed', label: 'Tốc độ', type: 'select', width: 90, options: ['4G', '8G', '16G', '32G', '64G', 'Other'] },
  { key: 'status', label: 'Trạng thái', type: 'select', width: 100, default: 'Using' },
  { key: 'notes', label: 'Ghi chú', type: 'text', width: 120 },
]

export default function SANInventory() {
  return <CategoryPage title="🔀 SAN Switches" category="san_switches" fields={FIELDS} />
}
