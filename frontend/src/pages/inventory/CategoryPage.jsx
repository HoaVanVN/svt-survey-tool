import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { inventory as api } from '../../api'
import { useRefs } from '../../hooks/useRefs'
import { useAutoSave } from '../../hooks/useAutoSave'
import InventoryTable from '../../components/InventoryTable'

export default function CategoryPage({ title, category, fields }) {
  const { id } = useParams()
  const refs = useRefs()
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    api.getCategory(id, category)
      .then(r => setItems(r.data.items || []))
      .catch(() => setItems([]))
  }, [id, category])

  const doSave = useCallback(async () => {
    await api.saveCategory(id, category, items)
  }, [id, category, items])

  const { isDirty, lastSaved, markClean } = useAutoSave(items, doSave)

  const save = async () => {
    setSaving(true)
    try {
      await api.saveCategory(id, category, items)
      markClean()
      toast.success(`Đã lưu ${title}`)
    } catch {
      toast.error('Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  const clearAll = async () => {
    if (items.length === 0) return
    if (!window.confirm(`Xóa tất cả ${items.length} thiết bị trong "${title}"?\nDữ liệu sẽ bị xóa và lưu ngay lập tức.`)) return
    setClearing(true)
    try {
      setItems([])
      await api.saveCategory(id, category, [])
      markClean()
      toast.success(`Đã xóa tất cả dữ liệu ${title}`)
    } catch {
      toast.error('Lỗi khi xóa')
    } finally {
      setClearing(false)
    }
  }

  const fmtTime = (d) => d ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{title}
          <span className="text-gray-400 text-sm font-normal ml-2">({items.length} thiết bị)</span>
        </h3>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs text-amber-600 font-medium">● chưa lưu</span>
          )}
          {!isDirty && lastSaved && (
            <span className="text-xs text-green-600">✓ tự động lưu {fmtTime(lastSaved)}</span>
          )}
        </div>
      </div>
      <InventoryTable fields={fields} items={items} onChange={setItems} refs={refs} />
      <div className="flex justify-between pt-2">
        <button
          className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={clearAll}
          disabled={items.length === 0 || clearing || saving}
        >
          {clearing ? '⏳ Đang xóa...' : '🗑️ Xóa tất cả'}
        </button>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu'}
        </button>
      </div>
    </div>
  )
}
