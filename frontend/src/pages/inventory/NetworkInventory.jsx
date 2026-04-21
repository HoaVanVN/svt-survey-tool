import React from 'react'
import CategoryPage from './CategoryPage'

const FIELDS = [
  { key: 'name', label: 'Tên thiết bị', type: 'text', width: 130 },
  { key: 'model', label: 'Model', type: 'text', width: 120 },
  { key: 'vendor', label: 'Vendor', type: 'text', width: 90 },
  { key: 'serial', label: 'Serial Number', type: 'text', width: 110 },
  { key: 'qty', label: 'SL', type: 'number', width: 55, default: 1 },
  { key: 'location', label: 'Vị trí', type: 'text', width: 90 },
  { key: 'device_type', label: 'Loại', type: 'select', width: 110, options: ['Switch', 'Router', 'Firewall', 'Load Balancer', 'WAF', 'IPS/IDS', 'Other'] },
  { key: 'ip_mgmt', label: 'IP Management', type: 'text', width: 110 },
  { key: 'status', label: 'Trạng thái', type: 'select', width: 100, default: 'Using' },
  { key: 'notes', label: 'Ghi chú', type: 'text', width: 120 },
]

export default function NetworkInventory() {
  return <CategoryPage title="🌐 Network Devices" category="network_devices" fields={FIELDS} />
}
