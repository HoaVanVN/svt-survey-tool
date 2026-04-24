import React from 'react'
import CategoryPage from './CategoryPage'

const FIELDS = [
  { key: 'site_name',       label: 'Site / Địa điểm',     type: 'text',   width: 120 },
  { key: 'isp',             label: 'ISP / Nhà cung cấp',  type: 'text',   width: 120 },
  { key: 'link_type',       label: 'Loại kết nối',         type: 'select', width: 130,
    options: ['Internet', 'MPLS', 'SD-WAN', 'Leased Line', 'Metro Ethernet',
              'Direct Connect', 'Point-to-Point', 'Backup 4G/5G', 'VSAT'] },
  { key: 'bandwidth_mbps',  label: 'Bandwidth (Mbps)',     type: 'number', width: 95 },
  { key: 'role',            label: 'Vai trò',              type: 'select', width: 100,
    options: ['Primary', 'Secondary', 'Backup', 'Load Balance'], default: 'Primary' },
  { key: 'interface',       label: 'Interface',            type: 'select', width: 100,
    options: ['1GbE', '10GbE', 'Fiber 1G', 'Fiber 10G', 'Serial', '4G LTE', '5G', 'ADSL', 'VDSL'] },
  { key: 'ip_public',       label: 'IP / Subnet',          type: 'text',   width: 130 },
  { key: 'vlan',            label: 'VLAN',                 type: 'text',   width: 70 },
  { key: 'sla',             label: 'SLA',                  type: 'text',   width: 80 },
  { key: 'contract_expiry', label: 'Hết hạn HĐ',           type: 'eos',    width: 95 },
  { key: 'monthly_cost',    label: 'Chi phí/tháng',        type: 'text',   width: 105 },
  { key: 'status',          label: 'Trạng thái',           type: 'select', width: 90,
    options: ['Active', 'Inactive', 'Planned'], default: 'Active' },
  { key: 'notes',           label: 'Ghi chú',              type: 'text',   width: 110 },
]

export default function WANLinkInventory() {
  return <CategoryPage title="🔗 WAN Links / Site Connections" category="wan_links" fields={FIELDS} />
}
