import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { inventory as api } from '../../api'
import { useRefs } from '../../hooks/useRefs'
import InventoryTable from '../../components/InventoryTable'

export default function CategoryPage({ title, category, fields }) {
  const { id } = useParams()
  const refs = useRefs()
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getCategory(id, category)
      .then(r => setItems(r.data.items || []))
      .catch(() => setItems([]))
  }, [id, category])

  const save = async () => {
    setSaving(true)
    try {
      await api.saveCategory(id, category, items)
      toast.success(`Đã lưu ${title}`)
    } catch {
      toast.error('Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{title}
          <span className="text-gray-400 text-sm font-normal ml-2">({items.length} thiết bị)</span>
        </h3>
      </div>
      <InventoryTable fields={fields} items={items} onChange={setItems} refs={refs} />
      <div className="flex justify-end pt-2">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu'}
        </button>
      </div>
    </div>
  )
}
