import React, { useState, useMemo } from 'react'
import PasteImportModal from './PasteImportModal'
import { useDragReorder } from '../hooks/useDragReorder'

// ── EOS badge ─────────────────────────────────────────────────────────────────
function parseEOS(val) {
  if (!val || !String(val).trim()) return null
  const s = String(val).trim()
  const parts = s.split('/')
  let year, month
  if (parts.length === 2) { month = parseInt(parts[0]) - 1; year = parseInt(parts[1]) }
  else { year = parseInt(parts[0]); month = 11 }
  if (isNaN(year)) return null
  return new Date(year, month, 1)
}

function EOSBadge({ value }) {
  const d = parseEOS(value)
  if (!d) return null
  const oos = d < new Date()
  return (
    <span className={`ml-1 px-1 py-0.5 rounded text-[9px] font-semibold ${oos ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
      {oos ? 'OOS' : 'OK'}
    </span>
  )
}

// ── Disk Tier list cell ───────────────────────────────────────────────────────
const DISK_TIERS = ['Tier0 – NVMe', 'Tier1 – SSD', 'Tier2 – HDD 10K/15K', 'Tier3 – HDD 7.2K']

function TierListCell({ value, onChange }) {
  const list = Array.isArray(value) ? value : []

  const add = () => onChange([...list, { tier: DISK_TIERS[0], raw_tb: 0, usable_tb: 0 }])
  const remove = (i) => onChange(list.filter((_, j) => j !== i))
  const setEntry = (i, f, v) => {
    const next = [...list]
    next[i] = { ...next[i], [f]: v }
    onChange(next)
  }

  return (
    <div className="space-y-1 min-w-[270px]">
      {/* Column headers */}
      {list.length > 0 && (
        <div className="grid items-center gap-0.5" style={{ gridTemplateColumns: '1fr 3.5rem 3.5rem 1.1rem' }}>
          <span className="text-[9px] text-gray-400 pl-0.5">Tier</span>
          <span className="text-[9px] text-blue-400 text-right">Raw TB</span>
          <span className="text-[9px] text-green-500 text-right">Use TB</span>
          <span />
        </div>
      )}
      {list.map((entry, i) => (
        <div key={i} className="grid items-center gap-0.5" style={{ gridTemplateColumns: '1fr 3.5rem 3.5rem 1.1rem' }}>
          <select
            className="text-[10px] border-gray-200 rounded px-0.5 py-0.5 border w-full"
            value={entry.tier || DISK_TIERS[0]}
            onChange={e => setEntry(i, 'tier', e.target.value)}
          >
            {DISK_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="number"
            step="0.1"
            min="0"
            className="border-blue-200 rounded px-0.5 py-0.5 border text-[10px] w-full text-right"
            placeholder="0"
            value={entry.raw_tb ?? ''}
            onChange={e => setEntry(i, 'raw_tb', parseFloat(e.target.value) || 0)}
          />
          <input
            type="number"
            step="0.1"
            min="0"
            className="border-green-200 rounded px-0.5 py-0.5 border text-[10px] w-full text-right text-green-700"
            placeholder="0"
            value={entry.usable_tb ?? ''}
            onChange={e => setEntry(i, 'usable_tb', parseFloat(e.target.value) || 0)}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-red-300 hover:text-red-500 text-xs leading-none pl-0.5"
            title="Xóa tier"
          >×</button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5 leading-none"
      >
        + Add tier
      </button>
      {list.length > 0 && (() => {
        const rawSum    = list.reduce((s, t) => s + (parseFloat(t.raw_tb)    || 0), 0)
        const usableSum = list.reduce((s, t) => s + (parseFloat(t.usable_tb) || 0), 0)
        return (rawSum > 0 || usableSum > 0) ? (
          <div className="text-[10px] text-gray-400 text-right border-t border-gray-100 pt-0.5 mt-0.5">
            Σ <span className="text-blue-500 font-medium">{rawSum.toFixed(1)}</span>
            {' / '}
            <span className="text-green-600 font-medium">{usableSum.toFixed(1)}</span>
            <span className="text-gray-300 ml-0.5">TB</span>
          </div>
        ) : null
      })()}
    </div>
  )
}

// ── Sort helpers ──────────────────────────────────────────────────────────────
function sortValue(item, key) {
  const v = item[key]
  if (v === null || v === undefined || v === '') return ''
  // Try numeric
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''))
  if (!isNaN(n) && String(v).trim() !== '') return n
  return String(v).toLowerCase()
}

function SortIcon({ active, dir }) {
  if (!active) return <span className="text-[9px] text-white/40 ml-0.5">↕</span>
  return <span className="text-[9px] text-yellow-300 ml-0.5">{dir === 'asc' ? '↑' : '↓'}</span>
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InventoryTable({ fields, items, onChange, refs = {} }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const add = () => {
    const blank = {}
    fields.forEach(f => { blank[f.key] = f.default ?? (f.type === 'tier_list' ? [] : '') })
    onChange([...items, blank])
  }

  const clone = (i) => {
    const copy = { ...items[i], name: (items[i].name || '') + ' (copy)' }
    const next = [...items]
    next.splice(i + 1, 0, copy)
    onChange(next)
  }

  const remove = (i) => onChange(items.filter((_, j) => j !== i))

  const set = (i, key, val) => {
    const next = [...items]
    next[i] = { ...next[i], [key]: val }
    onChange(next)
  }

  const getOptions = (f) => {
    if (f.refType && refs[f.refType]?.length) {
      return [...refs[f.refType]].sort((a, b) => a.localeCompare(b))
    }
    return f.options || []
  }

  // ── Sort state ───────────────────────────────────────────────────────────────
  const isSorted = sortKey !== null

  const handleHeaderClick = (key, type) => {
    if (type === 'tier_list') return // tier_list not sortable
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const clearSort = () => { setSortKey(null); setSortDir('asc') }

  // Sorted index mapping: sortedIndices[displayPos] = originalIndex in items[]
  const sortedIndices = useMemo(() => {
    const indices = items.map((_, i) => i)
    if (!sortKey) return indices
    return [...indices].sort((a, b) => {
      const va = sortValue(items[a], sortKey)
      const vb = sortValue(items[b], sortKey)
      let cmp
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb
      else cmp = String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [items, sortKey, sortDir])

  // ── Paste import ─────────────────────────────────────────────────────────────
  const pasteFields = fields
    .filter(f => f.type !== 'tier_list')
    .map(f => ({ key: f.key, label: f.label, type: f.type === 'eos' ? 'text' : f.type, pasteAlts: f.pasteAlts || [] }))

  const defaultItem = {}
  fields.forEach(f => { defaultItem[f.key] = f.default ?? (f.type === 'tier_list' ? [] : '') })

  const handlePasteImport = (rows, mode) => {
    if (mode === 'replace') onChange(rows)
    else onChange([...items, ...rows])
  }

  const drag = useDragReorder(items, onChange)

  return (
    <div>
      <div className="flex justify-end mb-2 gap-2 flex-wrap">
        {/* Sort active banner */}
        {isSorted && (
          <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 mr-auto">
            <span>
              Sắp xếp: <strong>{fields.find(f => f.key === sortKey)?.label ?? sortKey}</strong>{' '}
              <span className="text-blue-400">({sortDir === 'asc' ? 'A→Z / 0→9' : 'Z→A / 9→0'})</span>
            </span>
            <button onClick={clearSort} className="text-blue-400 hover:text-blue-600 font-bold ml-1" title="Xóa sắp xếp">✕</button>
          </div>
        )}
        <PasteImportModal
          fields={pasteFields}
          defaultItem={defaultItem}
          onImport={handlePasteImport}
        />
        <button className="btn-secondary text-xs" onClick={add}>+ Thêm</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="table-hdr w-6" title="Kéo để sắp xếp lại"></th>
              <th className="table-hdr text-center w-8">#</th>
              {fields.map(f => (
                <th
                  key={f.key}
                  className={`table-hdr ${f.type !== 'tier_list' ? 'cursor-pointer hover:bg-blue-700 select-none' : ''}`}
                  style={{ minWidth: f.width || 90 }}
                  onClick={() => handleHeaderClick(f.key, f.type)}
                  title={f.type !== 'tier_list' ? 'Click để sắp xếp' : ''}
                >
                  <span className="flex items-center gap-0.5">
                    <span className="flex-1">{f.label}</span>
                    {f.type !== 'tier_list' && (
                      <SortIcon active={sortKey === f.key} dir={sortDir} />
                    )}
                  </span>
                </th>
              ))}
              <th className="table-hdr w-16 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {sortedIndices.map((origIdx, displayIdx) => {
              const item = items[origIdx]
              return (
                <tr
                  key={origIdx}
                  draggable={!isSorted}
                  onDragStart={!isSorted ? drag.onDragStart(origIdx) : undefined}
                  onDragOver={!isSorted ? drag.onDragOver(origIdx) : undefined}
                  onDrop={!isSorted ? drag.onDrop(origIdx) : undefined}
                  onDragEnd={!isSorted ? drag.onDragEnd : undefined}
                  onDragLeave={!isSorted ? drag.onDragLeave : undefined}
                  className={`transition-colors ${
                    !isSorted && drag.dragOver === origIdx
                      ? 'border-t-2 border-blue-400 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="table-cell w-6 text-center" {...(!isSorted ? drag.handleProps : {})}>
                    {isSorted
                      ? <span className="text-gray-200 text-xs select-none">—</span>
                      : <span className="text-gray-300 hover:text-gray-500 text-sm select-none">⠿</span>
                    }
                  </td>
                  <td className="table-cell text-center text-gray-400">{displayIdx + 1}</td>
                  {fields.map(f => (
                    <td key={f.key} className="table-cell p-1">
                      {f.type === 'tier_list' ? (
                        <TierListCell
                          value={item[f.key]}
                          onChange={val => set(origIdx, f.key, val)}
                        />
                      ) : f.type === 'select' ? (
                        <select
                          className="text-xs border-gray-200 rounded px-1 py-1 border w-full"
                          value={item[f.key] ?? f.default ?? ''}
                          onChange={e => set(origIdx, f.key, e.target.value)}
                        >
                          <option value="">--</option>
                          {getOptions(f).map(o => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : f.type === 'number' ? (
                        <input
                          type="number"
                          className="border-gray-200 rounded px-1 py-1 border text-xs"
                          style={{ width: f.width || 70 }}
                          value={item[f.key] ?? f.default ?? ''}
                          onChange={e => set(origIdx, f.key, e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      ) : f.type === 'eos' ? (
                        <div className="flex items-center gap-1">
                          <input
                            className="border-gray-200 rounded px-1 py-1 border text-xs"
                            style={{ width: 85 }}
                            placeholder="MM/YYYY"
                            value={item[f.key] ?? ''}
                            onChange={e => set(origIdx, f.key, e.target.value)}
                          />
                          <EOSBadge value={item[f.key]} />
                        </div>
                      ) : (
                        <input
                          className="w-full text-xs border-gray-200 rounded px-1 py-1 border"
                          style={{ minWidth: f.width || 80 }}
                          value={item[f.key] ?? ''}
                          onChange={e => set(origIdx, f.key, e.target.value)}
                        />
                      )}
                    </td>
                  ))}
                  <td className="table-cell text-center">
                    <div className="flex justify-center gap-1.5">
                      <button onClick={() => clone(origIdx)} className="text-blue-400 hover:text-blue-600" title="Clone">⧉</button>
                      <button onClick={() => remove(origIdx)} className="text-red-400 hover:text-red-600" title="Xóa">✕</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!items.length && (
          <p className="text-center text-gray-400 py-8 text-sm">Chưa có dữ liệu. Nhấn "+ Thêm" hoặc "📋 Paste từ Excel" để bắt đầu.</p>
        )}
      </div>
    </div>
  )
}
