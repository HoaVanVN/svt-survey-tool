import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { inventory as api } from '../../api'
import { useRefs } from '../../hooks/useRefs'
import { useAutoSave } from '../../hooks/useAutoSave'
import InventoryTable from '../../components/InventoryTable'
import { RAID_OPTIONS, raidEff } from '../../utils/storageUtils'

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
  { key: 'tier_capacities',  label: 'Disk Tiers',      type: 'tier_list', width: 200, default: [] },
  { key: 'raid_type',        label: 'RAID',            type: 'select', width: 80,
    options: RAID_OPTIONS,
    pasteAlts: ['raid', 'raid type', 'raid level'] },
  { key: 'raw_capacity_tb',  label: 'Raw (TB)',         type: 'number', width: 75,
    pasteAlts: ['raw tb', 'raw capacity', 'raw', 'total raw'] },
  { key: 'usable_capacity_tb', label: 'Usable (TB)',   type: 'number', width: 80,
    pasteAlts: ['usable tb', 'usable capacity', 'usable', 'net capacity'] },
  { key: 'support_until',    label: 'Support Until',   type: 'eos',    width: 95 },
  { key: 'status',           label: 'Trạng thái',      type: 'select', refType: 'device_statuses', width: 100, default: 'Using' },
  { key: 'notes',            label: 'Ghi chú',         type: 'text',   width: 110 },
]

// Auto-compute raw_capacity_tb and usable_capacity_tb from tier_capacities + raid_type.
// Only updates if tiers are non-empty (allows manual override when no tiers defined).
function withAutoCapacity(item, prev) {
  const tiersChanged = JSON.stringify(item.tier_capacities) !== JSON.stringify(prev?.tier_capacities)
  const raidChanged  = item.raid_type !== prev?.raid_type
  if (!tiersChanged && !raidChanged) return item

  const tiers  = Array.isArray(item.tier_capacities) ? item.tier_capacities : []
  const rawSum = tiers.reduce((s, t) => s + (parseFloat(t.raw_tb) || 0), 0)
  if (rawSum <= 0) return item  // no tier data → keep manual values

  const eff = raidEff(item.raid_type)
  return {
    ...item,
    raw_capacity_tb:    Math.round(rawSum * 100) / 100,
    usable_capacity_tb: Math.round(rawSum * eff * 100) / 100,
  }
}

export default function StorageInventory() {
  const { id } = useParams()
  const refs = useRefs()
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
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
    const prev = prevRef.current
    const updated = newItems.map((item, i) => withAutoCapacity(item, prev[i]))
    prevRef.current = updated
    setItems(updated)
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

  // Quick totals (sum raw/usable × qty per device)
  const totalRaw    = items.reduce((s, d) => s + (parseFloat(d.raw_capacity_tb)    || 0) * (parseInt(d.qty) || 1), 0)
  const totalUsable = items.reduce((s, d) => s + (parseFloat(d.usable_capacity_tb) || 0) * (parseInt(d.qty) || 1), 0)

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
            <p className="text-xs text-gray-500 mt-0.5">
              Raw: <span className="font-medium text-gray-700">{totalRaw.toFixed(1)} TB</span>
              <span className="mx-1.5 text-gray-300">·</span>
              Usable: <span className="font-medium text-green-700">{totalUsable.toFixed(1)} TB</span>
              {totalRaw > 0 && (
                <span className="ml-1.5 text-gray-400">
                  ({Math.round(totalUsable / totalRaw * 100)}% hiệu suất)
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <InventoryTable fields={FIELDS} items={items} onChange={handleChange} refs={refs} />

      <div className="flex justify-between pt-2">
        <button
          className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => {
            if (items.length === 0) return
            if (window.confirm(`Xóa tất cả ${items.length} Storage Systems?\nThay đổi sẽ không tự động lưu.`))
              setItems([])
          }}
          disabled={items.length === 0}
        >
          🗑️ Xóa tất cả
        </button>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu'}
        </button>
      </div>
    </div>
  )
}
