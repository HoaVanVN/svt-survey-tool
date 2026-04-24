import React from 'react'
import CategoryPage from './CategoryPage'

const FIELDS = [
  { key: 'name',                label: 'Tên phòng máy',       type: 'text',   width: 130 },
  { key: 'location',            label: 'Địa điểm',             type: 'text',   width: 120 },
  { key: 'room_type',           label: 'Loại',                 type: 'select', width: 110,
    options: ['Data Center', 'Server Room', 'MDF', 'IDF', 'Colocation', 'Cloud DC'] },
  { key: 'tier_level',          label: 'Tier',                 type: 'select', width: 80,
    options: ['Tier I', 'Tier II', 'Tier III', 'Tier IV', 'Non-rated'] },
  { key: 'total_area_sqm',      label: 'DT (m²)',              type: 'number', width: 70 },
  { key: 'rack_count',          label: 'Rack tổng',            type: 'number', width: 75 },
  { key: 'rack_used',           label: 'Rack dùng',            type: 'number', width: 75 },
  { key: 'power_capacity_kva',  label: 'Điện (kVA)',           type: 'number', width: 78 },
  { key: 'ups_capacity_kva',    label: 'UPS (kVA)',             type: 'number', width: 78 },
  { key: 'ups_runtime_min',     label: 'UPS Runtime (phút)',   type: 'number', width: 95 },
  { key: 'generator',           label: 'Generator',            type: 'select', width: 80,
    options: ['Yes', 'No'] },
  { key: 'generator_kva',       label: 'Generator (kVA)',      type: 'number', width: 90 },
  { key: 'cooling_type',        label: 'Làm mát',              type: 'select', width: 130,
    options: ['Precision AC', 'CRAC', 'CRAH', 'Row-based cooling', 'In-row AC', 'Liquid cooling', 'Split AC'] },
  { key: 'cooling_capacity_kw', label: 'Làm mát (kW)',         type: 'number', width: 88 },
  { key: 'fire_suppression',    label: 'PCCC',                 type: 'select', width: 100,
    options: ['FM-200', 'Novec 1230', 'CO2', 'Halon', 'Sprinkler', 'None'] },
  { key: 'physical_security',   label: 'Bảo mật VL',           type: 'select', width: 120,
    options: ['Biometric', 'Key Card', 'PIN + Key Card', 'Biometric + PIN', 'Key', 'None'] },
  { key: 'status',              label: 'Trạng thái',           type: 'select', width: 100,
    options: ['Active', 'Planned', 'Decommissioned'], default: 'Active' },
  { key: 'notes',               label: 'Ghi chú',              type: 'text',   width: 120 },
]

export default function ServerRoomInventory() {
  return <CategoryPage title="🏢 Server Rooms / Data Center" category="server_rooms" fields={FIELDS} />
}
