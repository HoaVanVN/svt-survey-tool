import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { backup as api } from '../api'

const DEF = {
  backup_software: '', backup_target: '', air_gap_immutable: false, offsite_cloud: false, cloud_target: '', tape_required: false,
  tier1_rpo: '15 phút', tier1_rto: '1 giờ', tier2_rpo: '4 giờ', tier2_rto: '4 giờ',
  tier3_rpo: '24 giờ', tier3_rto: '8 giờ', tier4_rpo: '24 giờ', tier4_rto: '72 giờ',
  change_rate_pct: 5, dedup_ratio: 3, full_retention_count: 4, incremental_per_day: 1,
  incremental_retention_days: 30, copy_offsite: false, offsite_retention_days: 90, repo_overhead_pct: 20,
  backup_sources: []
}
const DEF_SRC = { name: '', data_type: '', size_tb: 0, growth_rate_pct: 10, backup_frequency: 'Daily', retention_days: 30, tier: 'Tier 2' }
const DATA_TYPES = ['Máy ảo (VM)', 'CSDL (Database)', 'File Server', 'Exchange/Email', 'SharePoint', 'NAS', 'Physical Server', 'Khác']
const FREQUENCIES = ['Hourly', '2x/day', 'Daily', '2x/week', 'Weekly', 'Monthly']
const TIERS = ['Tier 1 – Critical', 'Tier 2 – Important', 'Tier 3 – Standard', 'Tier 4 – Archive']

export default function BackupSurvey() {
  const { id } = useParams()
  const [data, setData] = useState(DEF)
  const [saving, setSaving] = useState(false)

  useEffect(() => { api.get(id).then(r => setData(r.data)).catch(() => setData(DEF)) }, [id])

  const set = (f, v) => setData(p => ({ ...p, [f]: v }))
  const setSrc = (i, f, v) => setData(p => { const s = [...p.backup_sources]; s[i] = { ...s[i], [f]: v }; return { ...p, backup_sources: s } })
  const addSrc = () => setData(p => ({ ...p, backup_sources: [...p.backup_sources, { ...DEF_SRC }] }))
  const removeSrc = (i) => setData(p => ({ ...p, backup_sources: p.backup_sources.filter((_, j) => j !== i) }))

  const save = async () => {
    setSaving(true)
    try { await api.save(id, data); toast.success('Đã lưu Backup Survey') }
    catch { toast.error('Lỗi khi lưu') }
    finally { setSaving(false) }
  }

  const totalSrc = data.backup_sources.reduce((a, s) => a + (s.size_tb || 0), 0)

  return (
    <div className="space-y-6">
      {/* Part A */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="bg-brand-100 text-brand-700 rounded px-2 py-0.5 text-xs font-bold">A</span>
          Chính sách Backup tổng quan
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Phần mềm Backup</label>
            <select className="form-select" value={data.backup_software || ''} onChange={e => set('backup_software', e.target.value)}>
              <option value="">-- Chọn --</option>
              {['Veeam', 'Commvault', 'Veritas NetBackup', 'IBM Spectrum Protect', 'Acronis', 'Nakivo', 'Rubrik', 'Cohesity', 'Khác'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Backup Target hiện tại</label>
            <select className="form-select" value={data.backup_target || ''} onChange={e => set('backup_target', e.target.value)}>
              <option value="">-- Chọn --</option>
              {['Local Disk', 'NAS', 'Tape', 'Dedup Appliance', 'Cloud', 'S3-Compatible', 'None'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          {[['air_gap_immutable', 'Air-gap / Immutable backup?'], ['offsite_cloud', 'Offsite / Cloud backup?'], ['tape_required', 'Tape backup?']].map(([f, label]) => (
            <div key={f}>
              <label className="form-label">{label}</label>
              <select className="form-select" value={data[f] ? 'Yes' : 'No'} onChange={e => set(f, e.target.value === 'Yes')}>
                <option>Yes</option><option>No</option>
              </select>
            </div>
          ))}
          {data.offsite_cloud && (
            <div>
              <label className="form-label">Cloud target</label>
              <select className="form-select" value={data.cloud_target || ''} onChange={e => set('cloud_target', e.target.value)}>
                <option value="">-- Chọn --</option>
                {['AWS S3', 'Azure Blob', 'GCP Storage', 'Private S3', 'Wasabi', 'Khác'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Part B – RTO/RPO */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="bg-brand-100 text-brand-700 rounded px-2 py-0.5 text-xs font-bold">B</span>
          RTO / RPO theo Tier
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>{['Tier', 'Mô tả', 'Ví dụ ứng dụng', 'RPO', 'RTO'].map(h => <th key={h} className="table-hdr">{h}</th>)}</tr>
            </thead>
            <tbody>
              {[
                ['Tier 1 – Critical', 'Mission-critical', 'Core Banking, ERP', 'tier1_rpo', 'tier1_rto'],
                ['Tier 2 – Important', 'Ứng dụng quan trọng', 'Email, HR System', 'tier2_rpo', 'tier2_rto'],
                ['Tier 3 – Standard', 'Ứng dụng thông thường', 'Dev/Test, File Server', 'tier3_rpo', 'tier3_rto'],
                ['Tier 4 – Archive', 'Lưu trữ / Cold data', 'Long-term backup', 'tier4_rpo', 'tier4_rto'],
              ].map(([tier, desc, ex, rpoF, rtoF]) => (
                <tr key={tier}>
                  <td className="table-cell font-medium">{tier}</td>
                  <td className="table-cell text-gray-500">{desc}</td>
                  <td className="table-cell text-gray-500">{ex}</td>
                  <td className="table-cell"><input className="form-input text-xs" value={data[rpoF] || ''} onChange={e => set(rpoF, e.target.value)} /></td>
                  <td className="table-cell"><input className="form-input text-xs" value={data[rtoF] || ''} onChange={e => set(rtoF, e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Part C – Sources */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <span className="bg-brand-100 text-brand-700 rounded px-2 py-0.5 text-xs font-bold">C</span>
            Nguồn dữ liệu Backup
          </h3>
          <button className="btn-secondary text-xs" onClick={addSrc}>+ Thêm nguồn</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>{['#', 'Tên nguồn dữ liệu', 'Loại', 'Dung lượng (TB)', 'Tăng trưởng (%/năm)', 'Tần suất', 'Retention (ngày)', 'Tier', ''].map(h => <th key={h} className="table-hdr text-center">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.backup_sources.map((src, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="table-cell text-center text-gray-400 w-8">{i + 1}</td>
                  <td className="table-cell p-1"><input className="w-full text-xs border-gray-200 rounded px-1 py-1 border min-w-[130px]" value={src.name || ''} onChange={e => setSrc(i, 'name', e.target.value)} /></td>
                  <td className="table-cell p-1">
                    <select className="w-full text-xs border-gray-200 rounded px-1 py-1 border" value={src.data_type || ''} onChange={e => setSrc(i, 'data_type', e.target.value)}>
                      <option value="">-</option>{DATA_TYPES.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </td>
                  {['size_tb', 'growth_rate_pct'].map(f => (
                    <td key={f} className="table-cell p-1"><input type="number" step="0.01" className="w-full text-xs border-gray-200 rounded px-1 py-1 border min-w-[70px]" value={src[f] ?? ''} onChange={e => setSrc(i, f, parseFloat(e.target.value) || 0)} /></td>
                  ))}
                  <td className="table-cell p-1">
                    <select className="w-full text-xs border-gray-200 rounded px-1 py-1 border" value={src.backup_frequency || 'Daily'} onChange={e => setSrc(i, 'backup_frequency', e.target.value)}>
                      {FREQUENCIES.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="table-cell p-1"><input type="number" className="w-full text-xs border-gray-200 rounded px-1 py-1 border min-w-[70px]" value={src.retention_days ?? ''} onChange={e => setSrc(i, 'retention_days', parseInt(e.target.value) || 0)} /></td>
                  <td className="table-cell p-1">
                    <select className="w-full text-xs border-gray-200 rounded px-1 py-1 border" value={src.tier || 'Tier 2'} onChange={e => setSrc(i, 'tier', e.target.value)}>
                      {TIERS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="table-cell"><button onClick={() => removeSrc(i)} className="text-red-400 hover:text-red-600">✕</button></td>
                </tr>
              ))}
              {data.backup_sources.length > 0 && (
                <tr className="bg-yellow-50 font-semibold">
                  <td colSpan={3} className="table-cell text-center text-xs font-bold">TỔNG (TB)</td>
                  <td className="table-cell text-center text-xs font-bold">{totalSrc.toFixed(2)}</td>
                  <td colSpan={5} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Part D */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="bg-brand-100 text-brand-700 rounded px-2 py-0.5 text-xs font-bold">D</span>
          Thông số tính toán Backup Repository
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            ['change_rate_pct', 'Change Rate / ngày (%)', 0.5],
            ['dedup_ratio', 'Tỉ lệ nén + dedup (x)', 0.1],
            ['full_retention_count', 'Số bản Full backup giữ', 1],
            ['incremental_per_day', 'Số bản Incremental / ngày', 1],
            ['incremental_retention_days', 'Retention Incremental (ngày)', 1],
            ['offsite_retention_days', 'Retention Offsite (ngày)', 1],
            ['repo_overhead_pct', 'Repository overhead (%)', 0.5],
          ].map(([f, label, step]) => (
            <div key={f}>
              <label className="form-label">{label}</label>
              <input type="number" step={step} className="form-input" value={data[f] ?? ''} onChange={e => set(f, parseFloat(e.target.value) || 0)} />
            </div>
          ))}
          <div>
            <label className="form-label">Copy to offsite</label>
            <select className="form-select" value={data.copy_offsite ? 'Yes' : 'No'} onChange={e => set('copy_offsite', e.target.value === 'Yes')}>
              <option>Yes</option><option>No</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu Backup Survey'}
        </button>
      </div>
    </div>
  )
}
