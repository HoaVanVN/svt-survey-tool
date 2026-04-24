import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { inventory as api } from '../../api'
import { useRefs } from '../../hooks/useRefs'
import { useAutoSave } from '../../hooks/useAutoSave'
import InventoryTable from '../../components/InventoryTable'
import { tierColor } from '../../utils/storageUtils'

const FIELDS = [
  { key: 'name',             label: 'Tên thiết bị',   type: 'text',   width: 130 },
  { key: 'model',            label: 'Model',           type: 'text',   width: 110 },
  { key: 'vendor',           label: 'Vendor',          type: 'select', refType: 'vendors', width: 100 },
  { key: 'serial',           label: 'Serial',          type: 'text',   width: 100 },
  { key: 'qty',              label: 'SL',              type: 'number', width: 50,  default: 1 },
  { key: 'location',         label: 'Vị trí',          type: 'text',   width: 90 },
  { key: 'storage_type',     label: 'Loại',            type: 'select', refType: 'storage_types', width: 95 },
  { key: 'protocol',         label: 'Protocol',        type: 'select', width: 90,
    options: ['FC', 'iSCSI', 'NVMe-oF', 'SAS', 'NFS', 'SMB/CIFS', 'FCoE', 'Khác'],
    pasteAlts: ['protocol', 'connection', 'connectivity'] },
  { key: 'host_ports',       label: 'Host Ports',      type: 'number', width: 75,
    pasteAlts: ['host ports', 'ports', 'hba ports', 'host port count'] },
  { key: 'host_port_type',   label: 'Port Type',       type: 'select', width: 115,
    options: ['8Gb FC', '16Gb FC', '32Gb FC', '64Gb FC', '1GbE', '10GbE', '25GbE', 'NVMe-oF 25GbE', 'NVMe-oF 100GbE', 'Khác'],
    pasteAlts: ['port type', 'hba type', 'port speed'] },
  // tier_capacities: each entry = { tier, raw_tb, usable_tb } — RAID/usable entered per tier
  { key: 'tier_capacities',  label: 'Disk Tiers (Raw / Usable per tier)', type: 'tier_list', width: 280, default: [] },
  { key: 'support_until',    label: 'Support Until',   type: 'eos',    width: 95 },
  { key: 'status',           label: 'Trạng thái',      type: 'select', refType: 'device_statuses', width: 100, default: 'Using' },
  { key: 'notes',            label: 'Ghi chú',         type: 'text',   width: 110 },
]

export default function StorageInventory() {
  const { id } = useParams()
  const refs = useRefs()
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const prevRef = useRef([])

  useEffect(() => {
    api.getCategory(id, 'storage_systems')
      .then(r => {
        const loaded = r.data.items || []
        setItems(loaded)
        prevRef.current = loaded
      })
      .catch(() => setItems([]))
  }, [id])

  const handleChange = (newItems) => {
    prevRef.current = newItems
    setItems(newItems)
  }

  const doSave = useCallback(async () => {
    await api.saveCategory(id, 'storage_systems', items)
  }, [id, items])

  const { isDirty, lastSaved, markClean } = useAutoSave(items, doSave)

  const fmtTime = (d) => d ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''

  const save = async () => {
    setSaving(true)
    try {
      await api.saveCategory(id, 'storage_systems', items)
      markClean()
      toast.success('Đã lưu Storage Systems')
    } catch {
      toast.error('Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  const clearAll = async () => {
    if (items.length === 0) return
    if (!window.confirm(`Xóa tất cả ${items.length} Storage Systems?\nDữ liệu sẽ bị xóa và lưu ngay lập tức.`)) return
    setClearing(true)
    try {
      setItems([])
      prevRef.current = []
      await api.saveCategory(id, 'storage_systems', [])
      markClean()
      toast.success('Đã xóa tất cả Storage Systems')
    } catch {
      toast.error('Lỗi khi xóa')
    } finally {
      setClearing(false)
    }
  }

  // Quick totals — summed from tier_capacities per device × qty
  const totalRaw = items.reduce((s, d) => {
    const qty  = parseInt(d.qty) || 1
    const tRaw = (d.tier_capacities || []).reduce((ts, t) => ts + (parseFloat(t.raw_tb)    || 0), 0)
    return s + tRaw * qty
  }, 0)
  const totalUsable = items.reduce((s, d) => {
    const qty     = parseInt(d.qty) || 1
    const tUsable = (d.tier_capacities || []).reduce((ts, t) => ts + (parseFloat(t.usable_tb) || 0), 0)
    return s + tUsable * qty
  }, 0)

  // Per-tier quick breakdown for header display
  const tierMap = {}
  items.forEach(d => {
    const qty = parseInt(d.qty) || 1
    ;(d.tier_capacities || []).forEach(t => {
      if (!t.tier) return
      if (!tierMap[t.tier]) tierMap[t.tier] = { raw: 0, usable: 0 }
      tierMap[t.tier].raw    += (parseFloat(t.raw_tb)    || 0) * qty
      tierMap[t.tier].usable += (parseFloat(t.usable_tb) || 0) * qty
    })
  })
  const tierEntries = Object.entries(tierMap).sort((a, b) => b[1].raw - a[1].raw)

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-3">
            <span>💿 Storage Systems
              <span className="text-gray-400 text-sm font-normal ml-2">({items.length} thiết bị)</span>
            </span>
            {isDirty && <span className="text-xs text-amber-600 font-medium">● chưa lưu</span>}
            {!isDirty && lastSaved && <span className="text-xs text-green-600">✓ tự động lưu {fmtTime(lastSaved)}</span>}
          </h3>
          {(totalRaw > 0 || totalUsable > 0) && (
            <div className="mt-0.5 space-y-0.5">
              <p className="text-xs text-gray-500">
                Tổng Raw: <span className="font-medium text-blue-700">{totalRaw.toFixed(1)} TB</span>
                <span className="mx-1.5 text-gray-300">·</span>
                Tổng Usable: <span className="font-medium text-green-700">{totalUsable.toFixed(1)} TB</span>
                {totalRaw > 0 && (
                  <span className="ml-1.5 text-gray-400">
                    ({Math.round(totalUsable / totalRaw * 100)}% eff.)
                  </span>
                )}
              </p>
              {tierEntries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tierEntries.map(([tier, v]) => (
                    <span key={tier} className="text-[10px] text-gray-500 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: tierColor(tier) }} />
                      <span className="font-medium">{tier}:</span>
                      <span className="text-blue-600">{v.raw.toFixed(1)}</span>
                      <span className="text-gray-300">/</span>
                      <span className="text-green-600">{v.usable.toFixed(1)} TB</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <InventoryTable fields={FIELDS} items={items} onChange={handleChange} refs={refs} />

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
