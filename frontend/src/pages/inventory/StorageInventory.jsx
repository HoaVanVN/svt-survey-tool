import React from 'react'
import CategoryPage from './CategoryPage'

const FIELDS = [
  { key: 'name',             label: 'Tên thiết bị',   type: 'text',   width: 130 },
  { key: 'model',            label: 'Model',           type: 'text',   width: 110 },
  { key: 'vendor',           label: 'Vendor',          type: 'select', refType: 'vendors', width: 100 },
  { key: 'serial',           label: 'Serial',          type: 'text',   width: 100 },
  { key: 'qty',              label: 'SL',              type: 'number', width: 50,  default: 1 },
  { key: 'location',         label: 'Vị trí',          type: 'text',   width: 90 },
  { key: 'storage_type',     label: 'Loại',            type: 'select', refType: 'storage_types', width: 95 },
  { key: 'protocol',         label: 'Protocol',        type: 'select', width: 90,
    options: ['FC', 'iSCSI', 'NVMe-oF', 'SAS', 'NFS', 'SMB/CIFS', 'FCoE', 'Khác'],
    pasteAlts: ['protocol', 'connection', 'connectivity'] },
  { key: 'host_ports',       label: 'Host Ports',      type: 'number', width: 75,
    pasteAlts: ['host ports', 'ports', 'hba ports', 'host port count'] },
  { key: 'host_port_type',   label: 'Port Type',       type: 'select', width: 115,
    options: ['8Gb FC', '16Gb FC', '32Gb FC', '64Gb FC', '1GbE', '10GbE', '25GbE', 'NVMe-oF 25GbE', 'NVMe-oF 100GbE', 'Khác'],
    pasteAlts: ['port type', 'hba type', 'port speed'] },
  { key: 'tier_capacities',  label: 'Disk Tiers',      type: 'tier_list', width: 200, default: [] },
  { key: 'raw_capacity_tb',  label: 'Raw (TB)',         type: 'number', width: 75,
    pasteAlts: ['raw tb', 'raw capacity', 'raw', 'total raw'] },
  { key: 'usable_capacity_tb', label: 'Usable (TB)',   type: 'number', width: 80,
    pasteAlts: ['usable tb', 'usable capacity', 'usable', 'net capacity'] },
  { key: 'support_until',    label: 'Support Until',   type: 'eos',    width: 95 },
  { key: 'status',           label: 'Trạng thái',      type: 'select', refType: 'device_statuses', width: 100, default: 'Using' },
  { key: 'notes',            label: 'Ghi chú',         type: 'text',   width: 110 },
]

export default function StorageInventory() {
  return <CategoryPage title="💿 Storage Systems" category="storage_systems" fields={FIELDS} />
}
