import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ocp as api } from '../api'

const DEF = {
  cluster_name: 'Production', ocp_version: '4.18', infra_platform: 'Bare Metal',
  deployment_topology: 'Standard', network_plugin: 'OVN-Kubernetes',
  ocp_virt_enabled: false, odf_enabled: false, growth_rate_pct: 20, sizing_years: 3,
  master_count: 3, master_vcpu: 8, master_ram_gib: 32, master_disk_gb: 1024,
  worker_count: 8, worker_vcpu: 32, worker_ram_gib: 128,
  infra_count: 3, infra_vcpu: 4, infra_ram_gib: 16, infra_disk_gb: 500,
  odf_node_count: 3, odf_vcpu: 16, odf_ram_gib: 64, odf_disk_gb: 2048,
  pod_namespaces: []
}
const DEF_NS = { name: '', pods: 1, vcpu_req: 0.5, vcpu_limit: 1, ram_req_gib: 1, ram_limit_gib: 2, notes: '' }

export default function OCPSurvey() {
  const { id } = useParams()
  const [data, setData] = useState(DEF)
  const [saving, setSaving] = useState(false)

  useEffect(() => { api.get(id).then(r => setData(r.data)).catch(() => setData(DEF)) }, [id])

  const set = (f, v) => setData(p => ({ ...p, [f]: v }))
  const setNs = (i, f, v) => setData(p => { const arr = [...p.pod_namespaces]; arr[i] = { ...arr[i], [f]: v }; return { ...p, pod_namespaces: arr } })
  const addNs = () => setData(p => ({ ...p, pod_namespaces: [...p.pod_namespaces, { ...DEF_NS }] }))
  const removeNs = (i) => setData(p => ({ ...p, pod_namespaces: p.pod_namespaces.filter((_, j) => j !== i) }))

  const save = async () => {
    setSaving(true)
    try { await api.save(id, data); toast.success('Đã lưu OCP Survey') }
    catch { toast.error('Lỗi khi lưu') }
    finally { setSaving(false) }
  }

  const totalClusterVCPU = data.master_count * data.master_vcpu + data.worker_count * data.worker_vcpu + data.infra_count * data.infra_vcpu + (data.odf_enabled ? data.odf_node_count * data.odf_vcpu : 0)
  const totalClusterRAM = data.master_count * data.master_ram_gib + data.worker_count * data.worker_ram_gib + data.infra_count * data.infra_ram_gib + (data.odf_enabled ? data.odf_node_count * data.odf_ram_gib : 0)

  const num = (f, label, step = 1, min = 0) => (
    <div>
      <label className="form-label">{label}</label>
      <input type="number" step={step} min={min} className="form-input" value={data[f] ?? ''} onChange={e => set(f, parseFloat(e.target.value) || 0)} />
    </div>
  )

  const NodeCard = ({ title, color, fields }) => (
    <div className={`rounded-lg border-2 ${color} p-4`}>
      <h4 className="font-semibold text-sm mb-3">{title}</h4>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(([f, label, step]) => (
          <div key={f}>
            <label className="text-xs text-gray-600 block mb-1">{label}</label>
            <input type="number" step={step || 1} min={0} className="form-input text-sm" value={data[f] ?? ''} onChange={e => set(f, parseFloat(e.target.value) || 0)} />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="bg-red-100 text-red-700 rounded px-2 py-0.5 text-xs font-bold">A</span>
          Cluster Profile
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="form-label">Tên cluster</label>
            <input className="form-input" value={data.cluster_name} onChange={e => set('cluster_name', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Phiên bản OCP</label>
            <select className="form-select" value={data.ocp_version} onChange={e => set('ocp_version', e.target.value)}>
              {['4.14', '4.15', '4.16', '4.17', '4.18'].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Nền tảng hạ tầng</label>
            <select className="form-select" value={data.infra_platform} onChange={e => set('infra_platform', e.target.value)}>
              {['Bare Metal', 'VMware vSphere', 'RHEV/oVirt', 'AWS', 'Azure', 'GCP', 'On-prem VM'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Deployment topology</label>
            <select className="form-select" value={data.deployment_topology} onChange={e => set('deployment_topology', e.target.value)}>
              {['Standard (3 master + workers)', 'Compact (3 master+worker)', 'SNO (Single Node)'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Network plugin</label>
            <select className="form-select" value={data.network_plugin} onChange={e => set('network_plugin', e.target.value)}>
              {['OVN-Kubernetes', 'OpenShift SDN'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          {[['ocp_virt_enabled', 'OpenShift Virtualization?'], ['odf_enabled', 'OpenShift Data Foundation?']].map(([f, label]) => (
            <div key={f}>
              <label className="form-label">{label}</label>
              <select className="form-select" value={data[f] ? 'Yes' : 'No'} onChange={e => set(f, e.target.value === 'Yes')}>
                <option>Yes</option><option>No</option>
              </select>
            </div>
          ))}
          {num('growth_rate_pct', 'Tỉ lệ tăng trưởng (%/năm)', 0.5)}
          {num('sizing_years', 'Năm dự phòng sizing')}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="bg-red-100 text-red-700 rounded px-2 py-0.5 text-xs font-bold">B</span>
          Node Sizing
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <NodeCard title="🏛️ Control Plane (Master)" color="border-blue-200 bg-blue-50" fields={[
            ['master_count', 'Số lượng nodes'], ['master_vcpu', 'vCPU / node'],
            ['master_ram_gib', 'RAM (GiB) / node'], ['master_disk_gb', 'OS Disk (GB) / node']
          ]} />
          <NodeCard title="⚙️ Worker Nodes" color="border-green-200 bg-green-50" fields={[
            ['worker_count', 'Số lượng nodes'], ['worker_vcpu', 'vCPU / node'],
            ['worker_ram_gib', 'RAM (GiB) / node'], ['worker_count', 'Current workers (ref)']
          ]} />
          <NodeCard title="🔧 Infrastructure Nodes" color="border-orange-200 bg-orange-50" fields={[
            ['infra_count', 'Số lượng nodes'], ['infra_vcpu', 'vCPU / node'],
            ['infra_ram_gib', 'RAM (GiB) / node'], ['infra_disk_gb', 'Disk (GB) / node']
          ]} />
          {data.odf_enabled && (
            <NodeCard title="💾 ODF Storage Nodes" color="border-purple-200 bg-purple-50" fields={[
              ['odf_node_count', 'Số lượng nodes'], ['odf_vcpu', 'vCPU / node'],
              ['odf_ram_gib', 'RAM (GiB) / node'], ['odf_disk_gb', 'Data Disk (GB) / node']
            ]} />
          )}
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-700">Cluster Total (hiện tại):</p>
          <div className="flex gap-4 mt-1 text-sm text-gray-600">
            <span>vCPU: <strong>{totalClusterVCPU.toLocaleString()}</strong></span>
            <span>RAM: <strong>{totalClusterRAM.toLocaleString()} GiB</strong></span>
            <span>Total nodes: <strong>{data.master_count + data.worker_count + data.infra_count + (data.odf_enabled ? data.odf_node_count : 0)}</strong></span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <span className="bg-red-100 text-red-700 rounded px-2 py-0.5 text-xs font-bold">C</span>
            Workload Container (Pods / Namespaces)
          </h3>
          <button className="btn-secondary text-xs" onClick={addNs}>+ Thêm Namespace</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>{['Namespace / App', 'Pods avg', 'vCPU Request', 'vCPU Limit', 'RAM Req (GiB)', 'RAM Limit (GiB)', 'Ghi chú', ''].map(h => <th key={h} className="table-hdr text-center">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.pod_namespaces.map((ns, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="table-cell p-1"><input className="w-full text-xs border-gray-200 rounded px-1 py-1 border min-w-[120px]" value={ns.name || ''} onChange={e => setNs(i, 'name', e.target.value)} /></td>
                  {['pods', 'vcpu_req', 'vcpu_limit', 'ram_req_gib', 'ram_limit_gib'].map(f => (
                    <td key={f} className="table-cell p-1"><input type="number" step="0.1" className="w-full text-xs border-gray-200 rounded px-1 py-1 border min-w-[60px]" value={ns[f] ?? ''} onChange={e => setNs(i, f, parseFloat(e.target.value) || 0)} /></td>
                  ))}
                  <td className="table-cell p-1"><input className="w-full text-xs border-gray-200 rounded px-1 py-1 border min-w-[80px]" value={ns.notes || ''} onChange={e => setNs(i, 'notes', e.target.value)} /></td>
                  <td className="table-cell"><button onClick={() => removeNs(i)} className="text-red-400 hover:text-red-600">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu OCP Survey'}
        </button>
      </div>
    </div>
  )
}
