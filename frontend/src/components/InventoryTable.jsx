import React, { useState } from 'react'
import PasteImportModal from './PasteImportModal'

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

  const add = () => onChange([...list, { tier: DISK_TIERS[0], raw_tb: 0 }])
  const remove = (i) => onChange(list.filter((_, j) => j !== i))
  const setEntry = (i, f, v) => {
    const next = [...list]
    next[i] = { ...next[i], [f]: v }
    onChange(next)
  }

  return (
    <div className="space-y-1 min-w-[190px]">
      {list.map((entry, i) => (
        <div key={i} className="flex items-center gap-1">
          <select
            className="text-[10px] border-gray-200 rounded px-0.5 py-0.5 border flex-1 min-w-0"
            value={entry.tier || DISK_TIERS[0]}
            onChange={e => setEntry(i, 'tier', e.target.value)}
          >
            {DISK_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="number"
            step="0.1"
            min="0"
            className="border-gray-200 rounded px-1 py-0.5 border text-[10px] w-14 text-right"
            placeholder="TB"
            value={entry.raw_tb ?? ''}
            onChange={e => setEntry(i, 'raw_tb', parseFloat(e.target.value) || 0)}
          />
          <span className="text-[9px] text-gray-400 shrink-0">TB</span>
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-red-300 hover:text-red-500 text-xs shrink-0 leading-none"
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
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InventoryTable({ fields, items, onChange, refs = {} }) {
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
    if (f.refType && refs[f.refType]?.length) return refs[f.refType]
    return f.options || []
  }

  // Paste import: build field definitions suitable for PasteImportModal
  const pasteFields = fields
    .filter(f => f.type !== 'tier_list') // tier_list can't be pasted as plain text
    .map(f => ({ key: f.key, label: f.label, type: f.type === 'eos' ? 'text' : f.type, pasteAlts: f.pasteAlts || [] }))

  const defaultItem = {}
  fields.forEach(f => { defaultItem[f.key] = f.default ?? (f.type === 'tier_list' ? [] : '') })

  const handlePasteImport = (rows, mode) => {
    if (mode === 'replace') {
      onChange(rows)
    } else {
      onChange([...items, ...rows])
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-2 gap-2">
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
              <th className="table-hdr text-center w-8">#</th>
              {fields.map(f => (
                <th key={f.key} className="table-hdr" style={{ minWidth: f.width || 90 }}>{f.label}</th>
              ))}
              <th className="table-hdr w-16 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="table-cell text-center text-gray-400">{i + 1}</td>
                {fields.map(f => (
                  <td key={f.key} className="table-cell p-1">
                    {f.type === 'tier_list' ? (
                      <TierListCell
                        value={item[f.key]}
                        onChange={val => set(i, f.key, val)}
                      />
                    ) : f.type === 'select' ? (
                      <select
                        className="text-xs border-gray-200 rounded px-1 py-1 border w-full"
                        value={item[f.key] ?? f.default ?? ''}
                        onChange={e => set(i, f.key, e.target.value)}
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
                        onChange={e => set(i, f.key, e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    ) : f.type === 'eos' ? (
                      <div className="flex items-center gap-1">
                        <input
                          className="border-gray-200 rounded px-1 py-1 border text-xs"
                          style={{ width: 85 }}
                          placeholder="MM/YYYY"
                          value={item[f.key] ?? ''}
                          onChange={e => set(i, f.key, e.target.value)}
                        />
                        <EOSBadge value={item[f.key]} />
                      </div>
                    ) : (
                      <input
                        className="w-full text-xs border-gray-200 rounded px-1 py-1 border"
                        style={{ minWidth: f.width || 80 }}
                        value={item[f.key] ?? ''}
                        onChange={e => set(i, f.key, e.target.value)}
                      />
                    )}
                  </td>
                ))}
                <td className="table-cell text-center">
                  <div className="flex justify-center gap-1.5">
                    <button onClick={() => clone(i)} className="text-blue-400 hover:text-blue-600" title="Clone">⧉</button>
                    <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600" title="Xóa">✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <p className="text-center text-gray-400 py-8 text-sm">Chưa có dữ liệu. Nhấn "+ Thêm" hoặc "📋 Paste từ Excel" để bắt đầu.</p>
        )}
      </div>
    </div>
  )
}
