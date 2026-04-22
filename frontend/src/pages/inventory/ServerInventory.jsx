import React from 'react'
import CategoryPage from './CategoryPage'

const FIELDS = [
  { key: 'name', label: 'Tên thiết bị', type: 'text', width: 130 },
  { key: 'model', label: 'Model', type: 'text', width: 110 },
  { key: 'vendor', label: 'Vendor', type: 'select', refType: 'vendors', width: 100 },
  { key: 'serial', label: 'Serial', type: 'text', width: 100 },
  { key: 'qty', label: 'SL', type: 'number', width: 50, default: 1 },
  { key: 'location', label: 'Vị trí', type: 'text', width: 90 },
  { key: 'server_type', label: 'Loại server', type: 'select', refType: 'server_types', width: 100 },
  { key: 'hypervisor', label: 'Hypervisor', type: 'select', refType: 'hypervisors', width: 130 },
  { key: 'cpu', label: 'CPU', type: 'text', width: 110 },
  { key: 'ram_gb', label: 'RAM (GB)', type: 'number', width: 70 },
  { key: 'os', label: 'OS', type: 'select', refType: 'os_list', width: 150 },
  { key: 'end_of_support', label: 'Hết HT (MM/YYYY)', type: 'eos', width: 100 },
  { key: 'status', label: 'Trạng thái', type: 'select', refType: 'device_statuses', width: 100, default: 'Using' },
  { key: 'notes', label: 'Ghi chú', type: 'text', width: 110 },
]

export default function ServerInventory() {
  return <CategoryPage title="🖥️ Physical Servers" category="servers" fields={FIELDS} />
}
