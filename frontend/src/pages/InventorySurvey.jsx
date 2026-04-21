import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { inventory as api } from '../api'

const DEF = { servers: [], san_switches: [], storage_systems: [], network_devices: [], wifi_aps: [] }

const CATEGORIES = [
  { key: 'servers', title: '🖥️ Physical Servers', fields: ['name', 'model', 'vendor', 'serial', 'qty', 'location', 'status', 'cpu', 'ram_gb', 'notes'] },
  { key: 'san_switches', title: '🔀 SAN Switches', fields: ['name', 'model', 'vendor', 'serial', 'qty', 'location', 'status', 'ports', 'speed', 'notes'] },
  { key: 'storage_systems', title: '💿 Storage Systems', fields: ['name', 'model', 'vendor', 'serial', 'qty', 'location', 'status', 'capacity_tb', 'type', 'notes'] },
  { key: 'network_devices', title: '🌐 Network Devices', fields: ['name', 'model', 'vendor', 'serial', 'qty', 'location', 'status', 'ip', 'role', 'notes'] },
  { key: 'wifi_aps', title: '📶 WiFi Access Points', fields: ['name', 'model', 'vendor', 'serial', 'qty', 'location', 'status', 'ssid', 'band', 'notes'] },
]

const DEF_ITEM = { name: '', model: '', vendor: '', serial: '', qty: 1, location: '', status: 'Using', notes: '' }

export default function InventorySurvey() {
  const { id } = useParams()
  const [data, setData] = useState(DEF)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState({ servers: true, san_switches: false, storage_systems: false, network_devices: false, wifi_aps: false })

  useEffect(() => { api.get(id).then(r => setData(r.data)).catch(() => setData(DEF)) }, [id])

  const addItem = (cat) => setData(p => ({ ...p, [cat]: [...(p[cat] || []), { ...DEF_ITEM }] }))
  const removeItem = (cat, i) => setData(p => ({ ...p, [cat]: p[cat].filter((_, j) => j !== i) }))
  const setField = (cat, i, f, v) => setData(p => {
    const arr = [...p[cat]]
    arr[i] = { ...arr[i], [f]: v }
    return { ...p, [cat]: arr }
  })

  const save = async () => {
    setSaving(true)
    try { await api.save(id, data); toast.success('Đã lưu Physical Inventory') }
    catch { toast.error('Lỗi khi lưu') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {CATEGORIES.map(cat => (
        <div key={cat.key} className="card">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpen(p => ({ ...p, [cat.key]: !p[cat.key] }))}>
            <h3 className="font-semibold text-gray-800">{cat.title} <span className="text-gray-400 text-sm font-normal">({(data[cat.key] || []).length} items)</span></h3>
            <span className="text-gray-400">{open[cat.key] ? '▲' : '▼'}</span>
          </div>
          {open[cat.key] && (
            <div className="mt-4">
              <div className="flex justify-end mb-2">
                <button className="btn-secondary text-xs" onClick={() => addItem(cat.key)}>+ Thêm</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="table-hdr text-center">#</th>
                      {['Tên thiết bị', 'Model', 'Vendor', 'Serial Number', 'SL', 'Vị trí lắp đặt', 'Trạng thái', 'Ghi chú', ''].map(h => (
                        <th key={h} className="table-hdr">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data[cat.key] || []).map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="table-cell text-center text-gray-400 w-8">{i + 1}</td>
                        {['name', 'model', 'vendor', 'serial'].map(f => (
                          <td key={f} className="table-cell p-1">
                            <input className="w-full text-xs border-gray-200 rounded px-1 py-1 border min-w-[80px]" value={item[f] || ''} onChange={e => setField(cat.key, i, f, e.target.value)} />
                          </td>
                        ))}
                        <td className="table-cell p-1">
                          <input type="number" className="w-16 text-xs border-gray-200 rounded px-1 py-1 border" value={item.qty ?? 1} onChange={e => setField(cat.key, i, 'qty', parseInt(e.target.value) || 1)} />
                        </td>
                        <td className="table-cell p-1">
                          <input className="w-full text-xs border-gray-200 rounded px-1 py-1 border min-w-[80px]" value={item.location || ''} onChange={e => setField(cat.key, i, 'location', e.target.value)} />
                        </td>
                        <td className="table-cell p-1">
                          <select className="text-xs border-gray-200 rounded px-1 py-1 border" value={item.status || 'Using'} onChange={e => setField(cat.key, i, 'status', e.target.value)}>
                            {['Using', 'Standby', 'EOL', 'Decommissioned', 'Phased-out'].map(s => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="table-cell p-1">
                          <input className="w-full text-xs border-gray-200 rounded px-1 py-1 border min-w-[80px]" value={item.notes || ''} onChange={e => setField(cat.key, i, 'notes', e.target.value)} />
                        </td>
                        <td className="table-cell">
                          <button onClick={() => removeItem(cat.key, i)} className="text-red-400 hover:text-red-600">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!(data[cat.key] || []).length && (
                  <p className="text-center text-gray-400 py-6 text-sm">Chưa có thiết bị nào. Nhấn "+ Thêm" để bắt đầu.</p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="flex justify-end">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu Physical Inventory'}
        </button>
      </div>
    </div>
  )
}
