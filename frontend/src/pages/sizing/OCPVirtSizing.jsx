import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ocp as api } from '../../api'

const BLANK = { name: '', vm_count: 1, vcpu_per_vm: 4, ram_gib_per_vm: 16, disk_gb_per_vm: 100, os: '', tier: 'Production', notes: '' }

export default function OCPVirtSizing() {
  const { id } = useParams()
  const [workloads, setWorkloads] = useState([])
  const [sizing, setSizing] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.virtSizing(id)
      .then(r => { setWorkloads(r.data.workloads || []); setSizing(r.data) })
      .catch(() => {})
  }, [id])

  const add = () => setWorkloads(p => [...p, { ...BLANK }])
  const remove = (i) => setWorkloads(p => p.filter((_, j) => j !== i))
  const clone = (i) => {
    const copy = { ...workloads[i], name: workloads[i].name + ' (copy)' }
    const next = [...workloads]; next.splice(i + 1, 0, copy); setWorkloads(next)
  }
  const set = (i, k, v) => setWorkloads(p => { const a = [...p]; a[i] = { ...a[i], [k]: v }; return a })

  const save = async () => {
    setSaving(true)
    try {
      await api.saveVirtWorkloads(id, workloads)
      const r = await api.virtSizing(id)
      setSizing(r.data)
      toast.success('Đã lưu & tính sizing OCP Virt')
    } catch { toast.error('Lỗi khi lưu') }
    finally { setSaving(false) }
  }

  const totals = workloads.reduce((s, w) => ({
    vms: s.vms + (w.vm_count || 0),
    vcpu: s.vcpu + (w.vm_count || 0) * (w.vcpu_per_vm || 0),
    ram: s.ram + (w.vm_count || 0) * (w.ram_gib_per_vm || 0),
    disk: s.disk + (w.vm_count || 0) * (w.disk_gb_per_vm || 0),
  }), { vms: 0, vcpu: 0, ram: 0, disk: 0 })

  return (
    <div className="space-y-4">
      {/* Workload input table */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">☸️ OCP Virtualization – VM Workloads</h3>
          <button className="btn-secondary text-xs" onClick={add}>+ Thêm VM Workload</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="table-hdr text-center w-8">#</th>
                <th className="table-hdr" style={{minWidth:130}}>Tên Workload</th>
                <th className="table-hdr" style={{minWidth:55}}>Số VM</th>
                <th className="table-hdr" style={{minWidth:65}}>vCPU/VM</th>
                <th className="table-hdr" style={{minWidth:75}}>RAM GiB/VM</th>
                <th className="table-hdr" style={{minWidth:75}}>Disk GB/VM</th>
                <th className="table-hdr" style={{minWidth:110}}>OS</th>
                <th className="table-hdr" style={{minWidth:90}}>Tier</th>
                <th className="table-hdr" style={{minWidth:110}}>Ghi chú</th>
                <th className="table-hdr w-16 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {workloads.map((w, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="table-cell text-center text-gray-400">{i + 1}</td>
                  <td className="table-cell p-1"><input className="w-full text-xs border-gray-200 rounded px-1 py-1 border" value={w.name || ''} onChange={e => set(i, 'name', e.target.value)} /></td>
                  <td className="table-cell p-1"><input type="number" className="w-full text-xs border-gray-200 rounded px-1 py-1 border" value={w.vm_count ?? 1} onChange={e => set(i, 'vm_count', +e.target.value || 0)} /></td>
                  <td className="table-cell p-1"><input type="number" className="w-full text-xs border-gray-200 rounded px-1 py-1 border" value={w.vcpu_per_vm ?? 4} onChange={e => set(i, 'vcpu_per_vm', +e.target.value || 0)} /></td>
                  <td className="table-cell p-1"><input type="number" className="w-full text-xs border-gray-200 rounded px-1 py-1 border" value={w.ram_gib_per_vm ?? 16} onChange={e => set(i, 'ram_gib_per_vm', +e.target.value || 0)} /></td>
                  <td className="table-cell p-1"><input type="number" className="w-full text-xs border-gray-200 rounded px-1 py-1 border" value={w.disk_gb_per_vm ?? 100} onChange={e => set(i, 'disk_gb_per_vm', +e.target.value || 0)} /></td>
                  <td className="table-cell p-1"><input className="w-full text-xs border-gray-200 rounded px-1 py-1 border" value={w.os || ''} onChange={e => set(i, 'os', e.target.value)} /></td>
                  <td className="table-cell p-1">
                    <select className="w-full text-xs border-gray-200 rounded px-1 py-1 border" value={w.tier || 'Production'} onChange={e => set(i, 'tier', e.target.value)}>
                      {['Production', 'Staging', 'Development', 'Test'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="table-cell p-1"><input className="w-full text-xs border-gray-200 rounded px-1 py-1 border" value={w.notes || ''} onChange={e => set(i, 'notes', e.target.value)} /></td>
                  <td className="table-cell text-center">
                    <div className="flex justify-center gap-1.5">
                      <button onClick={() => clone(i)} className="text-blue-400 hover:text-blue-600" title="Clone">⧉</button>
                      <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600" title="Xóa">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {workloads.length > 0 && (
              <tfoot>
                <tr className="bg-yellow-50 font-semibold text-xs">
                  <td className="table-cell" colSpan={2}>TỔNG</td>
                  <td className="table-cell text-center">{totals.vms} VMs</td>
                  <td className="table-cell text-center">{totals.vcpu}</td>
                  <td className="table-cell text-center">{totals.ram} GiB</td>
                  <td className="table-cell text-center">{totals.disk} GB</td>
                  <td className="table-cell" colSpan={4}></td>
                </tr>
              </tfoot>
            )}
          </table>
          {!workloads.length && (
            <p className="text-center text-gray-400 py-8 text-sm">Chưa có VM workload. Nhấn "+ Thêm VM Workload" để bắt đầu.</p>
          )}
        </div>

        <div className="flex justify-end pt-3">
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? '⏳ Đang tính...' : '📐 Lưu & Tính Sizing'}
          </button>
        </div>
      </div>

      {/* Sizing results */}
      {sizing && sizing.additional_workers !== undefined && workloads.length > 0 && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-800">📊 Kết quả Sizing – OCP Virtualization</h3>

          <div className="grid md:grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
              <div className="text-3xl font-bold text-blue-700">{sizing.additional_workers}</div>
              <div className="text-sm text-blue-600 mt-1">Worker nodes bổ sung</div>
              <div className="text-xs text-blue-400">(cho OCP Virt hiện tại)</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 text-center border border-emerald-100">
              <div className="text-3xl font-bold text-emerald-700">{sizing.additional_workers_with_growth}</div>
              <div className="text-sm text-emerald-600 mt-1">Workers với tăng trưởng</div>
              <div className="text-xs text-emerald-400">(bao gồm growth rate)</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-100">
              <div className="text-3xl font-bold text-orange-700">{sizing.storage?.raw_raid5_tb} TB</div>
              <div className="text-sm text-orange-600 mt-1">VM Storage (RAID 5)</div>
              <div className="text-xs text-orange-400">{sizing.storage?.usable_disk_tb} TB usable</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Tài nguyên VM yêu cầu</h4>
              <table className="w-full">
                <tbody>
                  {[
                    ['Tổng VM', `${sizing.totals?.total_vcpu / (workloads[0]?.vcpu_per_vm || 1) | 0} → ${totals.vms} VMs`],
                    ['Tổng vCPU', `${sizing.totals?.total_vcpu} vCPUs`],
                    ['Tổng RAM', `${sizing.totals?.total_ram_gib} GiB`],
                    ['Tổng Disk', `${sizing.totals?.total_disk_gb} GB`],
                  ].map(([label, val]) => (
                    <tr key={label} className="border-b border-gray-100">
                      <td className="py-1 text-gray-500">{label}</td>
                      <td className="py-1 font-semibold text-gray-800 text-right">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Sizing với overhead (10% CPU, 20% RAM, 25% HA)</h4>
              <table className="w-full">
                <tbody>
                  {[
                    ['vCPU cần thiết (có OH)', `${sizing.sizing_params?.needed_vcpu_with_overhead}`],
                    ['RAM cần thiết (có OH)', `${sizing.sizing_params?.needed_ram_gib_with_overhead} GiB`],
                    ['Worker spec', `${sizing.sizing_params?.worker_vcpu} vCPU / ${sizing.sizing_params?.worker_ram_gib} GiB`],
                    ['Raw Disk RAID 6', `${sizing.storage?.raw_raid6_tb} TB`],
                  ].map(([label, val]) => (
                    <tr key={label} className="border-b border-gray-100">
                      <td className="py-1 text-gray-500">{label}</td>
                      <td className="py-1 font-semibold text-gray-800 text-right">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-50 rounded p-3 text-xs text-gray-500 border border-gray-100">
            <strong>Lưu ý:</strong> Worker spec lấy từ cấu hình OCP Survey (tab OCP). Để thay đổi spec worker, cập nhật tại tab ☸️ OCP.
            Sizing dựa trên: CPU overhead 10%, RAM overhead 20% (KubeVirt), HA reserve 25%.
          </div>
        </div>
      )}
    </div>
  )
}
