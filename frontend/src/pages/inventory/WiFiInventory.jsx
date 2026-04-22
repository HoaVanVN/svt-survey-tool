import React from 'react'
import CategoryPage from './CategoryPage'

const FIELDS = [
  { key: 'name', label: 'Tên thiết bị', type: 'text', width: 130 },
  { key: 'model', label: 'Model', type: 'text', width: 110 },
  { key: 'vendor', label: 'Vendor', type: 'select', refType: 'vendors', width: 100 },
  { key: 'serial', label: 'Serial', type: 'text', width: 100 },
  { key: 'qty', label: 'SL', type: 'number', width: 50, default: 1 },
  { key: 'location', label: 'Vị trí', type: 'text', width: 90 },
  { key: 'band', label: 'Band', type: 'select', refType: 'wifi_bands', width: 90 },
  { key: 'ssid', label: 'SSID', type: 'text', width: 110 },
  { key: 'end_of_support', label: 'Hết HT (MM/YYYY)', type: 'eos', width: 100 },
  { key: 'status', label: 'Trạng thái', type: 'select', refType: 'device_statuses', width: 100, default: 'Using' },
  { key: 'notes', label: 'Ghi chú', type: 'text', width: 110 },
]

export default function WiFiInventory() {
  return <CategoryPage title="📶 WiFi Access Points" category="wifi_aps" fields={FIELDS} />
}
