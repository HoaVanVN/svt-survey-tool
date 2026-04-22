import React from 'react'
import CategoryPage from './CategoryPage'

const FIELDS = [
  { key: 'name', label: 'Tên thiết bị', type: 'text', width: 130 },
  { key: 'model', label: 'Model', type: 'text', width: 110 },
  { key: 'vendor', label: 'Vendor', type: 'select', refType: 'vendors', width: 100 },
  { key: 'serial', label: 'Serial', type: 'text', width: 100 },
  { key: 'qty', label: 'SL', type: 'number', width: 50, default: 1 },
  { key: 'location', label: 'Vị trí', type: 'text', width: 90 },
  { key: 'device_type', label: 'Loại', type: 'select', refType: 'network_device_types', width: 100 },
  { key: 'ip_mgmt', label: 'IP Management', type: 'text', width: 110 },
  { key: 'support_until', label: 'Support Until', type: 'eos', width: 95 },
  { key: 'status', label: 'Trạng thái', type: 'select', refType: 'device_statuses', width: 100, default: 'Using' },
  { key: 'notes', label: 'Ghi chú', type: 'text', width: 110 },
]

export default function NetworkInventory() {
  return <CategoryPage title="🌐 Network Devices" category="network_devices" fields={FIELDS} />
}
