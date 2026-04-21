import React from 'react'
import CategoryPage from './CategoryPage'

const FIELDS = [
  { key: 'name', label: 'Tên thiết bị', type: 'text', width: 130 },
  { key: 'model', label: 'Model', type: 'text', width: 120 },
  { key: 'vendor', label: 'Vendor', type: 'text', width: 90 },
  { key: 'serial', label: 'Serial Number', type: 'text', width: 110 },
  { key: 'qty', label: 'SL', type: 'number', width: 55, default: 1 },
  { key: 'location', label: 'Vị trí', type: 'text', width: 90 },
  { key: 'band', label: 'Band', type: 'select', width: 90, options: ['2.4GHz', '5GHz', '6GHz', 'Dual-band', 'Tri-band'] },
  { key: 'ssid', label: 'SSID', type: 'text', width: 110 },
  { key: 'status', label: 'Trạng thái', type: 'select', width: 100, default: 'Using' },
  { key: 'notes', label: 'Ghi chú', type: 'text', width: 120 },
]

export default function WiFiInventory() {
  return <CategoryPage title="📶 WiFi Access Points" category="wifi_aps" fields={FIELDS} />
}
