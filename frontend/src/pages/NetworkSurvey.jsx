import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { network as api } from '../api'

const DEF = {
  site_count: 1, deployment_model: 'Single-site', site_distance_km: null, wan_bandwidth_gbps: null, wan_latency_ms: null,
  server_uplink_speed: '25GbE', uplink_count_per_server: 2, tor_switch_status: 'New', sdn_nsx_required: false, rdma_roce_required: false,
  storage_conn_type: 'FC 16G', hba_nic_per_server: 2, fabric_switch_existing: false, fc_ports_total: null, multipath_required: true,
  power_kw_per_rack: null, rack_count: null, redundant_power: true, cooling_type: 'Air',
  compliance_requirements: '', encryption_at_rest: false, encryption_in_transit: false, air_gap_required: false
}

export default function NetworkSurvey() {
  const { id } = useParams()
  const [data, setData] = useState(DEF)
  const [saving, setSaving] = useState(false)

  useEffect(() => { api.get(id).then(r => setData(r.data)).catch(() => setData(DEF)) }, [id])

  const set = (f, v) => setData(p => ({ ...p, [f]: v }))
  const num = (f, label, note) => (
    <div>
      <label className="form-label">{label}</label>
      {note && <p className="text-xs text-gray-400 mb-1">{note}</p>}
      <input type="number" className="form-input" value={data[f] ?? ''} onChange={e => set(f, e.target.value === '' ? null : parseFloat(e.target.value))} />
    </div>
  )
  const sel = (f, opts, label, note) => (
    <div>
      <label className="form-label">{label}</label>
      {note && <p className="text-xs text-gray-400 mb-1">{note}</p>}
      <select className="form-select" value={data[f] ?? ''} onChange={e => set(f, e.target.value)}>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
  const bool = (f, label, note) => (
    <div>
      <label className="form-label">{label}</label>
      {note && <p className="text-xs text-gray-400 mb-1">{note}</p>}
      <select className="form-select" value={data[f] ? 'Yes' : 'No'} onChange={e => set(f, e.target.value === 'Yes')}>
        <option>Yes</option><option>No</option>
      </select>
    </div>
  )

  const save = async () => {
    setSaving(true)
    try { await api.save(id, data); toast.success('Đã lưu Network Survey') }
    catch { toast.error('Lỗi khi lưu') }
    finally { setSaving(false) }
  }

  const Section = ({ title, children }) => (
    <div className="card">
      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span className="w-2 h-4 bg-brand-500 rounded-sm inline-block" />
        {title}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{children}</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <Section title="Topology & Site">
        {num('site_count', 'Số lượng site / datacenter')}
        {sel('deployment_model', ['Single-site', 'Stretch Cluster', 'Active-Active DR', 'Active-Passive DR'], 'Mô hình triển khai')}
        {num('site_distance_km', 'Khoảng cách giữa các site (km)')}
        {num('wan_bandwidth_gbps', 'Băng thông WAN (Gbps)')}
        {num('wan_latency_ms', 'Latency WAN (ms)')}
      </Section>

      <Section title="Network Fabric – Compute">
        {sel('server_uplink_speed', ['1GbE', '10GbE', '25GbE', '100GbE'], 'Tốc độ server uplink')}
        {num('uplink_count_per_server', 'Số uplink / server')}
        {sel('tor_switch_status', ['Existing', 'New'], 'Top-of-Rack switch')}
        {bool('sdn_nsx_required', 'Yêu cầu SDN / NSX?')}
        {bool('rdma_roce_required', 'Yêu cầu RDMA / RoCE?')}
      </Section>

      <Section title="Storage Network">
        {sel('storage_conn_type', ['FC 16G', 'FC 32G', 'iSCSI 10G', 'iSCSI 25G', 'NVMe-oF', 'NFS', 'iSER'], 'Loại kết nối storage')}
        {num('hba_nic_per_server', 'Số HBA / NIC / server')}
        {bool('fabric_switch_existing', 'Fabric switch hiện có?')}
        {num('fc_ports_total', 'Số FC ports cần thiết (tổng)')}
        {bool('multipath_required', 'Yêu cầu Multipath?')}
      </Section>

      <Section title="Power & Cooling">
        {num('power_kw_per_rack', 'Công suất điện (kW) / rack')}
        {num('rack_count', 'Số lượng rack dự kiến')}
        {bool('redundant_power', 'Redundant power (N+1)?')}
        {sel('cooling_type', ['Air', 'Liquid', 'Hybrid'], 'Loại làm mát')}
      </Section>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-4 bg-brand-500 rounded-sm inline-block" />
          Compliance & Security
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {bool('encryption_at_rest', 'Mã hóa dữ liệu at-rest?')}
          {bool('encryption_in_transit', 'Mã hóa dữ liệu in-transit?')}
          {bool('air_gap_required', 'Yêu cầu Air-gap / Isolated network?')}
          <div className="md:col-span-3">
            <label className="form-label">Yêu cầu tuân thủ (PCI-DSS, ISO27001, ...)</label>
            <input className="form-input" value={data.compliance_requirements || ''} onChange={e => set('compliance_requirements', e.target.value)} placeholder="VD: PCI-DSS, ISO 27001, GDPR" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu Network Survey'}
        </button>
      </div>
    </div>
  )
}
