import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { workload as wApi, backup as bApi, ocp as ocpApi, exportApi } from '../api'
import { customers as cApi } from '../api'

function ResultCard({ label, value, unit, color = 'blue', note }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    red: 'bg-red-50 border-red-200 text-red-900',
  }
  return (
    <div className={`rounded-lg border p-3 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{typeof value === 'number' ? value.toLocaleString() : value} <span className="text-sm font-normal">{unit}</span></p>
      {note && <p className="text-xs opacity-60 mt-1">{note}</p>}
    </div>
  )
}

function Section({ title, children, color = '#1d4ed8' }) {
  return (
    <div className="card">
      <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
        {title}
      </h3>
      {children}
    </div>
  )
}

export default function SizingResults() {
  const { id } = useParams()
  const [customer, setCustomer] = useState(null)
  const [compute, setCompute] = useState(null)
  const [storage, setStorage] = useState(null)
  const [backup, setBackup] = useState(null)
  const [ocpSizing, setOcpSizing] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      cApi.get(id),
      wApi.sizing(id),
      bApi.sizing(id),
      ocpApi.sizing(id),
    ]).then(([c, w, b, o]) => {
      if (c.status === 'fulfilled') setCustomer(c.value.data)
      if (w.status === 'fulfilled') { setCompute(w.value.data.compute); setStorage(w.value.data.storage) }
      if (b.status === 'fulfilled') setBackup(b.value.data)
      if (o.status === 'fulfilled') setOcpSizing(o.value.data)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">⏳ Đang tính toán...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">📊 Kết quả Sizing Tổng hợp</h2>
        <button className="btn-success" onClick={() => exportApi.excel(id, customer?.name)}>
          ⬇️ Export Excel Report
        </button>
      </div>

      {!compute && !backup && !ocpSizing && (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>Chưa có dữ liệu khảo sát. Vui lòng hoàn thành các form Workload, Backup, và OCP survey trước.</p>
        </div>
      )}

      {/* Compute Sizing */}
      {compute && (
        <Section title="🖥️ SIZING COMPUTE / SERVER" color="#1d4ed8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
            <ResultCard label="Tổng vCPU yêu cầu" value={compute.total_vcpu} unit="vCPUs" color="blue" />
            <ResultCard label="Tổng RAM yêu cầu" value={compute.total_ram_gb} unit="GB" color="blue" />
            <ResultCard label="pCPU cores (sau HA)" value={compute.pcpu_with_ha} unit="cores" color="orange" note={`Pre-HA: ${compute.pcpu_pre_ha} cores`} />
            <ResultCard label="RAM (sau HA)" value={compute.ram_with_ha_gb} unit="GB" color="orange" note={`Pre-HA: ${compute.ram_pre_ha_gb} GB`} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <ResultCard label="Min nodes (tính toán)" value={compute.min_nodes} unit="nodes" color="purple" />
            <ResultCard label="Nodes sau HA (N+1)" value={compute.ha_nodes} unit="nodes" color="purple" />
            <ResultCard label="Tăng trưởng (nodes)" value={compute.growth_nodes} unit="nodes" color="purple" />
            <ResultCard label="⭐ TỔNG SERVER ĐỀ XUẤT" value={compute.total_nodes} unit="nodes" color="green" note={`${compute.cpu_per_server} cores/server, ${compute.ram_per_server_gb} GB/server`} />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>{['Thông số', 'Yêu cầu', 'Năng lực thiết kế', 'Trạng thái'].map(h => <th key={h} className="table-hdr">{h}</th>)}</tr>
              </thead>
              <tbody>
                <tr>
                  <td className="table-cell">Total pCPU cores</td>
                  <td className="table-cell font-medium">{compute.pcpu_with_ha} cores</td>
                  <td className="table-cell font-medium">{compute.total_cpu_capacity} cores</td>
                  <td className="table-cell"><span className="badge bg-green-100 text-green-700">✅ Đủ</span></td>
                </tr>
                <tr>
                  <td className="table-cell">Total RAM</td>
                  <td className="table-cell font-medium">{compute.ram_with_ha_gb} GB</td>
                  <td className="table-cell font-medium">{compute.total_ram_capacity_gb} GB</td>
                  <td className="table-cell"><span className="badge bg-green-100 text-green-700">✅ Đủ</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Storage Sizing */}
      {storage && (
        <Section title="💿 SIZING PRIMARY STORAGE" color="#059669">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
            <ResultCard label="Tổng Disk OS" value={storage.total_os_gb} unit="GB" color="blue" />
            <ResultCard label="Tổng Disk Data" value={storage.total_data_gb} unit="GB" color="blue" />
            <ResultCard label="Total IOPS" value={storage.total_iops} unit="IOPS" color="orange" />
            <ResultCard label="Total Throughput" value={storage.total_throughput_mbps} unit="MB/s" color="orange" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <ResultCard label="Raw trước dedup" value={(storage.raw_before_dedup_gb / 1024).toFixed(2)} unit="TB" color="purple" note={`${storage.raw_before_dedup_gb} GB`} />
            <ResultCard label="Usable sau dedup" value={storage.usable_tb} unit="TB" color="purple" />
            <ResultCard label="⭐ Raw cần thiết (RAID 5)" value={storage.raw_raid5_tb} unit="TB" color="green" note="75% efficiency" />
            <ResultCard label="⭐ Raw cần thiết (RAID 6)" value={storage.raw_raid6_tb} unit="TB" color="green" note="66% efficiency" />
          </div>
        </Section>
      )}

      {/* Backup Sizing */}
      {backup && (
        <Section title="💾 SIZING BACKUP REPOSITORY" color="#7c3aed">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <ResultCard label="Tổng nguồn backup" value={backup.total_source_tb} unit="TB" color="blue" />
            <ResultCard label="Full backup (trước dedup)" value={backup.full_backup_tb} unit="TB" color="blue" />
            <ResultCard label="Incremental backup" value={backup.incr_backup_tb} unit="TB" color="orange" />
            <ResultCard label="Sau dedup/compress" value={backup.after_dedup_tb} unit="TB" color="orange" />
            <ResultCard label="⭐ Repository cần thiết" value={backup.repo_needed_tb} unit="TB" color="green" note="Bao gồm overhead" />
            <ResultCard label="Throughput tối thiểu" value={backup.min_throughput_gbph} unit="GB/h" color="purple" />
          </div>
        </Section>
      )}

      {/* OCP Sizing */}
      {ocpSizing && (
        <Section title="☸️ SIZING RED HAT OPENSHIFT" color="#CC0000">
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr>{['Loại Node', 'Số lượng', 'Total vCPU', 'Total RAM (GiB)', 'Ghi chú'].map(h => <th key={h} className="table-hdr text-center">{h}</th>)}</tr>
              </thead>
              <tbody>
                {[
                  ['🏛️ Control Plane (Master)', ocpSizing.master.count, ocpSizing.master.total_vcpu, ocpSizing.master.total_ram_gib, 'etcd, API, Scheduler'],
                  ['⚙️ Worker Nodes', ocpSizing.worker.count, ocpSizing.worker.total_vcpu, ocpSizing.worker.total_ram_gib, `Tăng trưởng: ${ocpSizing.worker.workers_with_growth} nodes`],
                  ['🔧 Infrastructure Nodes', ocpSizing.infra.count, ocpSizing.infra.total_vcpu, ocpSizing.infra.total_ram_gib, 'Router, Registry, Monitoring'],
                  ...(ocpSizing.odf.enabled ? [['💾 ODF Storage Nodes', ocpSizing.odf.count, ocpSizing.odf.total_vcpu, ocpSizing.odf.total_ram_gib, 'Ceph OSD, MON, MGR']] : []),
                ].map(([name, count, vcpu, ram, note]) => (
                  <tr key={name} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{name}</td>
                    <td className="table-cell text-center font-bold">{count}</td>
                    <td className="table-cell text-center">{vcpu}</td>
                    <td className="table-cell text-center">{ram}</td>
                    <td className="table-cell text-gray-500 text-xs">{note}</td>
                  </tr>
                ))}
                <tr className="bg-green-50 font-bold">
                  <td className="table-cell">⭐ CLUSTER TOTAL</td>
                  <td className="table-cell text-center">{ocpSizing.master.count + ocpSizing.worker.count + ocpSizing.infra.count + (ocpSizing.odf.enabled ? ocpSizing.odf.count : 0)}</td>
                  <td className="table-cell text-center text-green-700">{ocpSizing.cluster_total.vcpu}</td>
                  <td className="table-cell text-center text-green-700">{ocpSizing.cluster_total.ram_gib} GiB</td>
                  <td className="table-cell" />
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* BOM Summary */}
      {(compute || storage || backup) && (
        <Section title="📋 BILL OF MATERIALS – TÓM TẮT" color="#374151">
          <div className="space-y-2 text-sm">
            {compute && (
              <div className="flex justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="font-medium">I. Compute / Server Nodes</span>
                <span className="font-bold text-blue-700">{compute.total_nodes} nodes × ({compute.cpu_per_server} cores, {compute.ram_per_server_gb} GB RAM)</span>
              </div>
            )}
            {storage && (
              <>
                <div className="flex justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                  <span className="font-medium">II. Primary Storage (RAID 5)</span>
                  <span className="font-bold text-green-700">{storage.raw_raid5_tb} TB raw</span>
                </div>
                <div className="flex justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                  <span className="font-medium">II. Primary Storage (RAID 6)</span>
                  <span className="font-bold text-green-700">{storage.raw_raid6_tb} TB raw</span>
                </div>
              </>
            )}
            {backup && (
              <div className="flex justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                <span className="font-medium">III. Backup Repository</span>
                <span className="font-bold text-purple-700">{backup.repo_needed_tb} TB</span>
              </div>
            )}
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
            <p className="text-sm text-gray-500">Xuất Excel để xem BOM chi tiết với model, đơn giá và tổng thành tiền</p>
            <button className="btn-success mt-3" onClick={() => exportApi.excel(id, customer?.name)}>
              ⬇️ Export Excel Report (Full BOM)
            </button>
          </div>
        </Section>
      )}
    </div>
  )
}
