import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { workload as api } from '../api'
import PasteImportModal from '../components/PasteImportModal'
import { useDragReorder } from '../hooks/useDragReorder'

const DEF_SURVEY = {
  env_type: 'Production', virt_platform: 'VMware', current_system: 'On-premise',
  ha_required: true, cluster_nodes: 3, growth_years: 3, growth_rate: 20,
  virt_ratio: 4, cpu_overhead_pct: 10, ram_overhead_pct: 10, ha_reserve_pct: 25,
  storage_snapshot_pct: 20, storage_syslog_pct: 15, dedup_ratio: 2,
  cpu_sockets: 2, cores_per_socket: 16, ram_per_server_gb: 512,
  workload_items: []
}

const DEF_ITEM = { name: '', workload_type: '', vm_count: 1, vcpu_per_vm: 4, ram_gb_per_vm: 16, disk_os_gb_per_vm: 100, disk_data_gb_per_vm: 500, iops_per_vm: 0, throughput_mbps_per_vm: 0, os_type: '', tier: 'Tier 2', notes: '' }

const WORKLOAD_TYPES = ['Web/App Server', 'Database', 'File Server', 'Email Server', 'ERP/CRM', 'Monitoring', 'Dev/Test', 'Container', 'HPC', 'Khác']

const PASTE_FIELDS = [
  { key: 'name',                  label: 'Tên Workload',    type: 'text',   pasteAlts: ['name', 'tên', 'workload', 'application', 'app'] },
  { key: 'workload_type',         label: 'Loại',            type: 'text',   pasteAlts: ['type', 'loại', 'workload type', 'category'] },
  { key: 'vm_count',              label: 'Số VM',           type: 'number', pasteAlts: ['vms', 'vm count', 'số vm', 'count', 'quantity', 'số lượng'] },
  { key: 'vcpu_per_vm',           label: 'vCPU/VM',         type: 'number', pasteAlts: ['vcpu', 'cpu', 'cores', 'vcpu per vm', 'core per vm'] },
  { key: 'ram_gb_per_vm',         label: 'RAM (GB)/VM',     type: 'number', pasteAlts: ['ram', 'memory', 'ram gb', 'ram per vm', 'memory gb'] },
  { key: 'disk_os_gb_per_vm',     label: 'Disk OS (GB)/VM', type: 'number', pasteAlts: ['os disk', 'disk os', 'os gb', 'boot disk', 'system disk'] },
  { key: 'disk_data_gb_per_vm',   label: 'Disk Data (GB)/VM', type: 'number', pasteAlts: ['data disk', 'disk data', 'data gb', 'data storage'] },
  { key: 'iops_per_vm',           label: 'IOPS/VM',         type: 'number', pasteAlts: ['iops', 'iops per vm'] },
  { key: 'throughput_mbps_per_vm',label: 'Throughput MB/s', type: 'number', pasteAlts: ['bandwidth', 'throughput', 'mbps', 'bw', 'mb/s'] },
  { key: 'os_type',               label: 'OS Type',         type: 'text',   pasteAlts: ['os', 'os type', 'operating system', 'guest os'] },
  { key: 'tier',                  label: 'Tier',            type: 'text',   pasteAlts: ['tier', 'priority', 'criticality', 'sla'] },
  { key: 'notes',                 label: 'Ghi chú',         type: 'text',   pasteAlts: ['notes', 'note', 'comment', 'remarks', 'ghi chú'] },
]
const TIERS = ['Tier 1 – Critical', 'Tier 2 – Important', 'Tier 3 – Standard', 'Tier 4 – Archive']
const OS_TYPES = ['Windows Server 2019', 'Windows Server 2022', 'RHEL 8', 'RHEL 9', 'Ubuntu 22.04', 'Ubuntu 24.04', 'CentOS 7', 'Debian 12', 'Khác']

export default function WorkloadSurvey() {
  const { id } = useParams()
  const [data, setData] = useState(DEF_SURVEY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(id).then(r => setData(r.data)).catch(() => setData(DEF_SURVEY))
  }, [id])

  const set = (f, v) => setData(p => ({ ...p, [f]: v }))
  const setItem = (i, f, v) => setData(p => {
    const items = [...p.workload_items]
    items[i] = { ...items[i], [f]: v }
    return { ...p, workload_items: items }
  })
  const addItem = () => setData(p => ({ ...p, workload_items: [...p.workload_items, { ...DEF_ITEM }] }))
  const removeItem = (i) => setData(p => ({ ...p, workload_items: p.workload_items.filter((_, j) => j !== i) }))
  const cloneItem = (i) => setData(p => {
    const items = [...p.workload_items]
    const clone = { ...items[i], name: (items[i].name || '') + ' (copy)' }
    items.splice(i + 1, 0, clone)
    return { ...p, workload_items: items }
  })

  const save = async () => {
    setSaving(true)
    try { await api.save(id, data); toast.success('Đã lưu Workload Survey') }
    catch { toast.error('Lỗi khi lưu') }
    finally { setSaving(false) }
  }

  const moveItem = (next) => setData(p => ({ ...p, workload_items: next }))
  const drag = useDragReorder(data.workload_items, moveItem)

  const totals = data.workload_items.reduce((acc, i) => ({
    vm: acc.vm + (i.vm_count || 0),
    vcpu: acc.vcpu + (i.vm_count || 0) * (i.vcpu_per_vm || 0),
    ram: acc.ram + (i.vm_count || 0) * (i.ram_gb_per_vm || 0),
    os: acc.os + (i.vm_count || 0) * (i.disk_os_gb_per_vm || 0),
    data: acc.data + (i.vm_count || 0) * (i.disk_data_gb_per_vm || 0),
  }), { vm: 0, vcpu: 0, ram: 0, os: 0, data: 0 })

  const sel = (f, opts, label) => (
    <div key={f}>
      <label className="form-label">{label}</label>
      <select className="form-select" value={data[f]} onChange={e => set(f, e.target.value)}>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
  const num = (f, label, step = 1) => (
    <div key={f}>
      <label className="form-label">{label}</label>
      <input type="number" step={step} className="form-input" value={data[f]} onChange={e => set(f, parseFloat(e.target.value) || 0)} />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Part A */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="bg-brand-100 text-brand-700 rounded px-2 py-0.5 text-xs font-bold">A</span>
          Thông tin môi trường tổng quan
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sel('env_type', ['Production', 'DR', 'Dev-Test', 'Pre-Prod'], 'Loại môi trường')}
          {sel('virt_platform', ['VMware', 'Hyper-V', 'KVM', 'Bare Metal', 'Cloud', 'Red Hat Virt'], 'Nền tảng ảo hóa')}
          {sel('current_system', ['On-premise', 'Hybrid', 'Cloud Migration', 'Cloud Native'], 'Hệ thống hiện tại')}
          <div>
            <label className="form-label">Yêu cầu HA</label>
            <select className="form-select" value={data.ha_required ? 'Yes' : 'No'} onChange={e => set('ha_required', e.target.value === 'Yes')}>
              <option>Yes</option><option>No</option>
            </select>
          </div>
          {num('cluster_nodes', 'Cluster nodes (dự kiến)')}
          {num('growth_years', 'Thời gian dự phòng (năm)')}
          {num('growth_rate', 'Tỉ lệ tăng trưởng (%/năm)', 0.5)}
        </div>
      </div>

      {/* Part B – Workload Items */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <span className="bg-brand-100 text-brand-700 rounded px-2 py-0.5 text-xs font-bold">B</span>
            Chi tiết Workload / VM Groups
          </h3>
          <div className="flex gap-2">
            <PasteImportModal
              fields={PASTE_FIELDS}
              defaultItem={{ ...DEF_ITEM }}
              onImport={(rows, mode) => {
                if (mode === 'replace') setData(p => ({ ...p, workload_items: rows }))
                else setData(p => ({ ...p, workload_items: [...p.workload_items, ...rows] }))
              }}
            />
            <button className="btn-secondary text-xs" onClick={addItem}>+ Thêm Workload</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="table-hdr w-6" title="Kéo để sắp xếp lại"></th>
                {['#', 'Tên Workload', 'Loại', 'Số VM', 'vCPU/VM', 'RAM (GB)/VM', 'Disk OS (GB)/VM', 'Disk Data (GB)/VM', 'IOPS/VM', 'Throughput MB/s', 'OS Type', 'Tier', 'Ghi chú', ''].map(h => (
                  <th key={h} className="table-hdr text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.workload_items.map((item, i) => (
                <tr
                  key={i}
                  draggable
                  onDragStart={drag.onDragStart(i)}
                  onDragOver={drag.onDragOver(i)}
                  onDrop={drag.onDrop(i)}
                  onDragEnd={drag.onDragEnd}
                  onDragLeave={drag.onDragLeave}
                  className={`transition-colors ${
                    drag.dragOver === i
                      ? 'border-t-2 border-blue-400 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="table-cell w-6 text-center" {...drag.handleProps}>
                    <span className="text-gray-300 hover:text-gray-500 text-sm select-none">⠿</span>
                  </td>
                  <td className="table-cell text-center text-gray-400 w-8">{i + 1}</td>
                  {['name', 'workload_type', 'vm_count', 'vcpu_per_vm', 'ram_gb_per_vm', 'disk_os_gb_per_vm', 'disk_data_gb_per_vm', 'iops_per_vm', 'throughput_mbps_per_vm'].map(f => (
                    <td key={f} className="table-cell p-1">
                      {f === 'workload_type' ? (
                        <select className="w-full text-xs border-gray-200 rounded px-1 py-1 border" value={item[f] || ''} onChange={e => setItem(i, f, e.target.value)}>
                          <option value="">-</option>
                          {WORKLOAD_TYPES.map(o => <option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={['vm_count', 'vcpu_per_vm', 'ram_gb_per_vm', 'disk_os_gb_per_vm', 'disk_data_gb_per_vm', 'iops_per_vm', 'throughput_mbps_per_vm'].includes(f) ? 'number' : 'text'}
                          className="w-full text-xs border-gray-200 rounded px-1 py-1 border min-w-[70px]"
                          value={item[f] || ''} onChange={e => setItem(i, f, f.includes('count') || f.includes('per_vm') ? parseFloat(e.target.value) || 0 : e.target.value)} />
                      )}
                    </td>
                  ))}
                  <td className="table-cell p-1">
                    <select className="w-full text-xs border-gray-200 rounded px-1 py-1 border" value={item.os_type || ''} onChange={e => setItem(i, 'os_type', e.target.value)}>
                      <option value="">-</option>
                      {OS_TYPES.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="table-cell p-1">
                    <select className="w-full text-xs border-gray-200 rounded px-1 py-1 border" value={item.tier || 'Tier 2'} onChange={e => setItem(i, 'tier', e.target.value)}>
                      {TIERS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="table-cell p-1">
                    <input className="w-full text-xs border-gray-200 rounded px-1 py-1 border min-w-[80px]" value={item.notes || ''} onChange={e => setItem(i, 'notes', e.target.value)} />
                  </td>
                  <td className="table-cell whitespace-nowrap">
                    <button onClick={() => cloneItem(i)} className="text-blue-400 hover:text-blue-600 mr-2" title="Clone workload">⧉</button>
                    <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600" title="Xóa">✕</button>
                  </td>
                </tr>
              ))}
              {data.workload_items.length > 0 && (
                <tr className="bg-yellow-50 font-semibold">
                  <td colSpan={4} className="table-cell text-center text-xs font-bold">TỔNG / TOTAL</td>
                  {[totals.vm, totals.vcpu, totals.ram, totals.os, totals.data].map((v, i) => (
                    <td key={i} className="table-cell text-center text-xs font-bold">{Math.round(v).toLocaleString()}</td>
                  ))}
                  <td colSpan={6} />
                </tr>
              )}
            </tbody>
          </table>
          {data.workload_items.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">Chưa có workload nào. Nhấn "+ Thêm Workload" để bắt đầu.</p>
          )}
        </div>
      </div>

      {/* Part C */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="bg-brand-100 text-brand-700 rounded px-2 py-0.5 text-xs font-bold">C</span>
          Tỉ lệ ảo hóa & Overhead
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {num('virt_ratio', 'Tỉ lệ ảo hóa CPU (vCPU:pCPU)', 0.5)}
          {num('cpu_overhead_pct', 'CPU Overhead Hypervisor (%)', 0.5)}
          {num('ram_overhead_pct', 'RAM Overhead Hypervisor (%)', 0.5)}
          {num('ha_reserve_pct', 'HA Reserve (%)', 0.5)}
          {num('storage_snapshot_pct', 'Storage Overhead – Snapshot (%)', 0.5)}
          {num('storage_syslog_pct', 'Storage Overhead – System/Log (%)', 0.5)}
          {num('dedup_ratio', 'Tỉ lệ Dedup+Compression (x)', 0.1)}
        </div>
        <h4 className="font-medium text-gray-700 mt-4 mb-3">Cấu hình Server</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {num('cpu_sockets', 'CPU Sockets / server')}
          {num('cores_per_socket', 'Cores / socket')}
          {num('ram_per_server_gb', 'RAM / server (GB)')}
        </div>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu Workload Survey'}
        </button>
      </div>
    </div>
  )
}
