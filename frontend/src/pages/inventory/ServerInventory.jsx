import React from 'react'
import CategoryPage from './CategoryPage'

const FIELDS = [
  { key: 'name', label: 'Tên thiết bị', type: 'text', width: 130 },
  { key: 'model', label: 'Model', type: 'text', width: 120 },
  { key: 'vendor', label: 'Vendor', type: 'text', width: 90 },
  { key: 'serial', label: 'Serial Number', type: 'text', width: 110 },
  { key: 'qty', label: 'SL', type: 'number', width: 55, default: 1 },
  { key: 'location', label: 'Vị trí', type: 'text', width: 90 },
  { key: 'cpu', label: 'CPU', type: 'text', width: 110 },
  { key: 'ram_gb', label: 'RAM (GB)', type: 'number', width: 75 },
  { key: 'status', label: 'Trạng thái', type: 'select', width: 100, default: 'Using' },
  { key: 'notes', label: 'Ghi chú', type: 'text', width: 120 },
]

export default function ServerInventory() {
  return <CategoryPage title="🖥️ Physical Servers" category="servers" fields={FIELDS} />
}
