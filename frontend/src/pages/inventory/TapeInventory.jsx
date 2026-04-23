import React from 'react'
import CategoryPage from './CategoryPage'

const FIELDS = [
  { key: 'name',            label: 'Tên thiết bị',   type: 'text',   width: 130 },
  { key: 'model',           label: 'Model',           type: 'text',   width: 110 },
  { key: 'vendor',          label: 'Vendor',          type: 'select', refType: 'vendors', width: 100 },
  { key: 'serial',          label: 'Serial',          type: 'text',   width: 100 },
  { key: 'qty',             label: 'SL',              type: 'number', width: 50,  default: 1 },
  { key: 'location',        label: 'Vị trí',          type: 'text',   width: 90 },
  { key: 'drive_type',      label: 'Drive Type',      type: 'select', width: 100,
    options: ['LTO-6', 'LTO-7', 'LTO-8', 'LTO-9', 'LTO-9 Type M', 'LTO-Ultrium 9', 'TS1160', 'T10000', 'T10000T', 'Other'],
    pasteAlts: ['drive type', 'drive', 'lto', 'tape type', 'media type'] },
  { key: 'drive_count',     label: 'Drives',          type: 'number', width: 60,
    pasteAlts: ['drives', 'drive count', 'number of drives', 'tape drives'] },
  { key: 'slot_count',      label: 'Slots',           type: 'number', width: 60,
    pasteAlts: ['slots', 'slot count', 'tape slots', 'cartridge slots'] },
  { key: 'interface',       label: 'Interface',       type: 'select', width: 90,
    options: ['FC 8Gb', 'FC 16Gb', 'FC 32Gb', 'SAS', 'SAS-3', 'iSCSI', 'Other'],
    pasteAlts: ['interface', 'connection', 'port type', 'connectivity'] },
  { key: 'raw_capacity_tb', label: 'Capacity (TB)',   type: 'number', width: 90,
    pasteAlts: ['capacity', 'capacity tb', 'raw capacity', 'total capacity', 'native capacity'] },
  { key: 'software',        label: 'Backup Software', type: 'text',   width: 120,
    pasteAlts: ['software', 'backup software', 'backup app', 'backup tool'] },
  { key: 'support_until',   label: 'Support Until',   type: 'eos',    width: 95 },
  { key: 'status',          label: 'Trạng thái',      type: 'select', refType: 'device_statuses', width: 100, default: 'Using' },
  { key: 'notes',           label: 'Ghi chú',         type: 'text',   width: 110 },
]

export default function TapeInventory() {
  return <CategoryPage title="📼 Tape Libraries" category="tape_libraries" fields={FIELDS} />
}
