import React from 'react'
import CategoryPage from './CategoryPage'

const FIELDS = [
  { key: 'name', label: 'Tên VM', type: 'text', width: 130 },
  { key: 'guest_os', label: 'Guest OS', type: 'select', refType: 'os_list', width: 150 },
  { key: 'vcpu', label: 'vCPU', type: 'number', width: 55 },
  { key: 'ram_gb', label: 'RAM (GB)', type: 'number', width: 70 },
  { key: 'disk_gb', label: 'Disk (GB)', type: 'number', width: 70 },
  { key: 'host_server', label: 'Host / Cluster', type: 'text', width: 120 },
  { key: 'datastore', label: 'Datastore', type: 'text', width: 110 },
  { key: 'hypervisor', label: 'Hypervisor', type: 'select', refType: 'hypervisors', width: 130 },
  { key: 'environment', label: 'Môi trường', type: 'select', refType: 'environments', width: 100 },
  { key: 'power_state', label: 'Power', type: 'select', width: 80, options: ['On', 'Off', 'Suspended'] },
  { key: 'support_until', label: 'Support Until', type: 'eos', width: 95 },
  { key: 'status', label: 'Trạng thái', type: 'select', refType: 'device_statuses', width: 100, default: 'Using' },
  { key: 'notes', label: 'Ghi chú', type: 'text', width: 110 },
]

export default function VMInventory() {
  return <CategoryPage title="☁️ Virtual Machines" category="virtual_machines" fields={FIELDS} />
}
