import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { referenceApi } from '../api'

const CATEGORY_ORDER = [
  'os_list', 'vendors', 'hypervisors', 'server_types',
  'storage_types', 'network_device_types', 'wifi_bands',
  'app_types', 'criticality_levels', 'environments',
  'device_statuses', 'san_speeds',
]

export default function Settings() {
  const [refs, setRefs] = useState({})
  const [labels, setLabels] = useState({})
  const [edited, setEdited] = useState({})
  const [saving, setSaving] = useState({})
  const [open, setOpen] = useState({ os_list: true })

  useEffect(() => {
    referenceApi.getAll().then(r => {
      const { _labels, ...data } = r.data
      setRefs(data)
      setEdited(JSON.parse(JSON.stringify(data)))
      setLabels(_labels || {})
    }).catch(() => toast.error('Không thể tải Reference Data'))
  }, [])

  const addItem  = (key) => setEdited(p => ({ ...p, [key]: [...(p[key] || []), ''] }))
  const removeItem = (key, i) => setEdited(p => ({ ...p, [key]: p[key].filter((_, j) => j !== i) }))
  const editItem = (key, i, val) => setEdited(p => {
    const arr = [...p[key]]
    arr[i] = val
    return { ...p, [key]: arr }
  })
  const sortItems = (key) => setEdited(p => ({
    ...p,
    [key]: [...(p[key] || [])].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }))

  const save = async (key) => {
    setSaving(p => ({ ...p, [key]: true }))
    try {
      const items = (edited[key] || []).filter(s => s.trim())
      await referenceApi.save(key, items)
      setRefs(p => ({ ...p, [key]: items }))
      setEdited(p => ({ ...p, [key]: items }))
      toast.success('Đã lưu')
    } catch { toast.error('Lỗi khi lưu') }
    finally { setSaving(p => ({ ...p, [key]: false })) }
  }

  const reset = async (key) => {
    if (!confirm('Reset về danh sách mặc định?')) return
    setSaving(p => ({ ...p, [key]: true }))
    try {
      const r = await referenceApi.reset(key)
      setRefs(p => ({ ...p, [key]: r.data.items }))
      setEdited(p => ({ ...p, [key]: r.data.items }))
      toast.success('Đã reset về mặc định')
    } catch { toast.error('Lỗi khi reset') }
    finally { setSaving(p => ({ ...p, [key]: false })) }
  }

  const isDirty = (key) => JSON.stringify(edited[key]) !== JSON.stringify(refs[key])

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⚙️ Settings – Reference Data</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý danh sách OS, Vendor, Hypervisor... dùng trong Inventory & Survey</p>
        </div>
      </div>

      {CATEGORY_ORDER.map(key => {
        const items = edited[key] || []
        const isOpen = open[key]
        const dirty = isDirty(key)

        return (
          <div key={key} className="card">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setOpen(p => ({ ...p, [key]: !p[key] }))}
            >
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-800 text-sm">
                  {labels[key] || key}
                </h3>
                <span className="text-xs text-gray-400 font-normal">({items.length} items)</span>
                {dirty && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">chưa lưu</span>}
              </div>
              <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
            </div>

            {isOpen && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-1">
                      <input
                        className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
                        value={item}
                        onChange={e => editItem(key, i, e.target.value)}
                      />
                      <button
                        onClick={() => removeItem(key, i)}
                        className="text-red-400 hover:text-red-600 text-xs px-1"
                      >✕</button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => addItem(key)}
                  >+ Thêm</button>
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => sortItems(key)}
                    title="Sắp xếp theo thứ tự bảng chữ cái"
                  >🔤 A→Z</button>
                  <button
                    className="btn-primary text-xs"
                    onClick={() => save(key)}
                    disabled={saving[key] || !dirty}
                  >{saving[key] ? '⏳' : '💾'} Lưu</button>
                  <button
                    className="text-xs text-gray-400 hover:text-gray-600"
                    onClick={() => reset(key)}
                    disabled={saving[key]}
                  >↩ Reset mặc định</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
