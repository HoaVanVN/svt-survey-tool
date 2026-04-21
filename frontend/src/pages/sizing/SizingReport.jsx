import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { workload as wlApi, backup as bkApi, ocp as ocpApi, exportApi } from '../../api'

export default function SizingReport() {
  const { id } = useParams()
  const [comp, setComp] = useState(null)
  const [bk, setBk] = useState(null)
  const [ocpSz, setOcpSz] = useState(null)

  useEffect(() => {
    wlApi.sizing(id).then(r => setComp(r.data)).catch(() => {})
    bkApi.sizing(id).then(r => setBk(r.data)).catch(() => {})
    ocpApi.sizing(id).then(r => setOcpSz(r.data)).catch(() => {})
  }, [id])

  const Row = ({ label, value, unit, highlight }) => (
    <tr className={highlight ? 'bg-green-50' : 'hover:bg-gray-50'}>
      <td className={`table-cell font-medium ${highlight ? 'text-green-800' : ''}`}>{label}</td>
      <td className={`table-cell text-right font-bold ${highlight ? 'text-green-700' : ''}`}>{value ?? '-'}</td>
      <td className="table-cell text-gray-400 text-xs">{unit || ''}</td>
    </tr>
  )

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">📋 Sizing Report – Tổng kết</h3>
          <div className="flex gap-2">
            <button className="btn-secondary text-xs" onClick={() => exportApi.excel(id)}>⬇️ Excel</button>
            <button
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded font-medium transition-colors"
              onClick={() => exportApi.sizingPdf(id)}
            >📄 Export Sizing PDF</button>
          </div>
        </div>

        {comp && (
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">🖥️ Compute Sizing</h4>
              <table className="w-full text-xs">
                <tbody>
                  <Row label="Tổng vCPU" value={comp.compute?.total_vcpu} unit="vCPUs" />
                  <Row label="Tổng RAM" value={comp.compute?.total_ram_gb} unit="GB" />
                  <Row label="pCPU sau HA" value={comp.compute?.pcpu_with_ha} unit="cores" />
                  <Row label="RAM sau HA" value={comp.compute?.ram_with_ha_gb} unit="GB" />
                  <Row label="⭐ Server đề xuất" value={comp.compute?.total_nodes} unit="nodes" highlight />
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">💿 Storage Sizing</h4>
              <table className="w-full text-xs">
                <tbody>
                  <Row label="Tổng IOPS" value={comp.storage?.total_iops} unit="IOPS" />
                  <Row label="Usable cần thiết" value={comp.storage?.usable_tb} unit="TB" />
                  <Row label="⭐ Raw RAID 5" value={comp.storage?.raw_raid5_tb} unit="TB" highlight />
                  <Row label="⭐ Raw RAID 6" value={comp.storage?.raw_raid6_tb} unit="TB" highlight />
                </tbody>
              </table>
            </div>
          </div>
        )}

        {bk && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">💾 Backup Sizing</h4>
            <table className="w-full text-xs">
              <tbody>
                <Row label="Tổng nguồn backup" value={bk.total_source_tb} unit="TB" />
                <Row label="Sau dedup/compress" value={bk.after_dedup_tb} unit="TB" />
                <Row label="⭐ Repository cần thiết" value={bk.repo_needed_tb} unit="TB" highlight />
                <Row label="Throughput tối thiểu" value={bk.min_throughput_gbph} unit="GB/h" />
              </tbody>
            </table>
          </div>
        )}

        {ocpSz && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">☸️ OpenShift Sizing</h4>
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="table-hdr">Loại Node</th>
                  <th className="table-hdr text-right">Số lượng</th>
                  <th className="table-hdr text-right">Total vCPU</th>
                  <th className="table-hdr text-right">Total RAM (GiB)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Control Plane', ocpSz.master],
                  ['Worker Nodes', ocpSz.worker],
                  ['Infra Nodes', ocpSz.infra],
                  ...(ocpSz.odf ? [['ODF Nodes', ocpSz.odf]] : []),
                ].map(([name, data]) => data ? (
                  <tr key={name} className="hover:bg-gray-50">
                    <td className="table-cell">{name}</td>
                    <td className="table-cell text-right">{data.count}</td>
                    <td className="table-cell text-right">{data.total_vcpu}</td>
                    <td className="table-cell text-right">{data.total_ram_gib}</td>
                  </tr>
                ) : null)}
                <tr className="bg-green-50 font-bold">
                  <td className="table-cell text-green-800">⭐ Cluster Total</td>
                  <td className="table-cell"></td>
                  <td className="table-cell text-right text-green-700">{ocpSz.cluster_total?.vcpu}</td>
                  <td className="table-cell text-right text-green-700">{ocpSz.cluster_total?.ram_gib} GiB</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {!comp && !bk && !ocpSz && (
          <p className="text-center text-gray-400 py-8">Chưa có dữ liệu sizing. Vui lòng nhập dữ liệu tại các tab Workload, Backup, OCP.</p>
        )}
      </div>
    </div>
  )
}
