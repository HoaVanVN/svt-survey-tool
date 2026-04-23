import React, { useState, useCallback, useMemo } from 'react'

// ── TSV parser ────────────────────────────────────────────────────────────────
function parseTSV(text) {
  return text
    .trim()
    .split('\n')
    .map(line => line.split('\t').map(c => c.trim()))
    .filter(row => row.some(c => c !== ''))
}

function detectHeaders(firstRow, fields) {
  const norm = firstRow.map(h => h.toLowerCase())
  const fieldTokens = fields.flatMap(f => [
    f.label.toLowerCase(),
    f.key.toLowerCase(),
    ...(f.pasteAlts || []).map(a => a.toLowerCase()),
  ])
  const matches = norm.filter(h =>
    fieldTokens.some(t => t === h || t.includes(h) || (h.includes(t) && h.length > 2))
  )
  return matches.length >= Math.min(2, Math.ceil(firstRow.length * 0.35))
}

function buildAutoColMap(headerRow, fields) {
  const map = {}
  headerRow.forEach((raw, ci) => {
    const h = raw.toLowerCase()
    const match = fields.find(f => {
      const tokens = [
        f.label.toLowerCase(),
        f.key.toLowerCase(),
        ...(f.pasteAlts || []).map(a => a.toLowerCase()),
      ]
      return tokens.some(t => t === h || t.includes(h) || (h.includes(t) && t.length > 2))
    })
    if (match && !(ci in map) && !Object.values(map).includes(match.key)) {
      map[ci] = match.key
    }
  })
  return map
}

function buildPositionalMap(fields) {
  return Object.fromEntries(fields.map((f, i) => [i, f.key]))
}

function rowToItem(cols, colMap, fields, defaultItem) {
  const item = { ...defaultItem }
  Object.entries(colMap).forEach(([ci, key]) => {
    if (!key) return
    const f = fields.find(f => f.key === key)
    const val = (cols[Number(ci)] || '').trim()
    if (!val) return
    if (f?.type === 'number') {
      item[key] = parseFloat(val.replace(/,/g, '')) || 0
    } else if (f?.type === 'bool') {
      item[key] = /^(yes|true|1|có)/i.test(val)
    } else {
      item[key] = val
    }
  })
  return item
}

// Build initial editable colMap (all columns, auto-mapped or '')
function initColMap(autoMap, colCount) {
  const m = {}
  for (let ci = 0; ci < colCount; ci++) m[ci] = autoMap[ci] || ''
  return m
}

// Sorted entries of colMap by column index
function sortedEntries(colMap) {
  return Object.entries(colMap).sort((a, b) => Number(a[0]) - Number(b[0]))
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PasteImportModal({
  fields,
  defaultItem = {},
  onImport,
  buttonLabel = '📋 Paste từ Excel',
  buttonClassName = 'btn-secondary text-xs',
}) {
  const [open, setOpen]         = useState(false)
  const [raw, setRaw]           = useState('')
  const [parsed, setParsed]     = useState(null)   // { isHeader, headerRow, dataRows, colCount }
  const [colMap, setColMap]     = useState({})      // { colIndex(str): fieldKey | '' }
  const [mode, setMode]         = useState('append')
  const [showMapper, setShowMapper] = useState(false)

  // ── Parse pasted text ──────────────────────────────────────────────────────
  const parse = useCallback(() => {
    const rows = parseTSV(raw)
    if (!rows.length) return

    const isHeader  = detectHeaders(rows[0], fields)
    const autoMap   = isHeader ? buildAutoColMap(rows[0], fields) : buildPositionalMap(fields)
    const dataRows  = isHeader ? rows.slice(1) : rows
    const colCount  = rows[0].length

    setParsed({ isHeader, headerRow: isHeader ? rows[0] : [], dataRows, colCount })
    setColMap(initColMap(autoMap, colCount))
    setShowMapper(false)
  }, [raw, fields])

  // ── Derived preview items ──────────────────────────────────────────────────
  const items = useMemo(() => {
    if (!parsed) return []
    const effectiveMap = Object.fromEntries(
      Object.entries(colMap).filter(([, v]) => v !== '')
    )
    return parsed.dataRows
      .filter(r => r.some(c => c))
      .map(r => rowToItem(r, effectiveMap, fields, defaultItem))
  }, [parsed, colMap, fields, defaultItem])

  // ── Column mapping update ──────────────────────────────────────────────────
  const updateCol = (ci, newKey) => {
    setColMap(prev => {
      const next = { ...prev }
      // If the chosen field is already assigned to another column, clear that column
      if (newKey) {
        Object.entries(next).forEach(([k, v]) => {
          if (v === newKey && Number(k) !== Number(ci)) next[k] = ''
        })
      }
      next[ci] = newKey
      return next
    })
  }

  const resetToAuto = () => {
    if (!parsed) return
    const autoMap = parsed.isHeader
      ? buildAutoColMap(parsed.headerRow, fields)
      : buildPositionalMap(fields)
    setColMap(initColMap(autoMap, parsed.colCount))
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const mappedCount = Object.values(colMap).filter(v => v !== '').length
  const mappedKeys  = new Set(Object.values(colMap).filter(v => v !== ''))

  const confirm = () => {
    if (items.length) { onImport(items, mode); close() }
  }
  const close = () => {
    setOpen(false); setRaw(''); setParsed(null); setColMap({}); setShowMapper(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <button className={buttonClassName} onClick={() => setOpen(true)}>{buttonLabel}</button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={close}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-gray-800">📋 Import từ Excel</h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            {/* ── Body ── */}
            <div className="p-4 space-y-3 overflow-auto flex-1">
              <p className="text-xs text-gray-500">
                Trong Excel, chọn ô muốn import (kể cả dòng tiêu đề nếu có) → Copy (Ctrl+C) → Dán vào đây.
                Hệ thống tự động khớp cột; bạn có thể điều chỉnh thủ công bằng nút 🔧.
              </p>

              <textarea
                className="w-full h-28 text-xs font-mono border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
                placeholder={"Dán dữ liệu Excel vào đây (Ctrl+V)…\n\nVí dụ có tiêu đề:\nTên\tvCPU\tRAM\nApp Server\t8\t32\n\nVí dụ không tiêu đề (khớp theo thứ tự cột):\nApp Server\t8\t32"}
                value={raw}
                onChange={e => { setRaw(e.target.value); setParsed(null); setColMap({}) }}
                onPaste={() => setTimeout(parse, 30)}
              />

              {/* ── Toolbar ── */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  className="btn-primary text-xs"
                  onClick={parse}
                  disabled={!raw.trim()}
                >
                  🔍 Phân tích
                </button>

                {parsed && (
                  <>
                    <span className="text-xs font-semibold text-gray-700">
                      {items.length} dòng &nbsp;·&nbsp; {mappedCount}/{parsed.colCount} cột được map
                    </span>
                    {parsed.isHeader
                      ? <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">✓ Nhận diện tiêu đề</span>
                      : <span className="text-xs text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200">⚠ Khớp theo vị trí</span>
                    }

                    <button
                      className={`text-xs px-2 py-1 rounded border transition-colors ml-auto ${
                        showMapper
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                      }`}
                      onClick={() => setShowMapper(v => !v)}
                    >
                      🔧 Tùy chỉnh cột mapping
                    </button>

                    <div className="flex items-center gap-3">
                      <label className="text-xs text-gray-600 flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="paste-mode" value="append" checked={mode === 'append'} onChange={() => setMode('append')} />
                        Thêm vào cuối
                      </label>
                      <label className="text-xs text-gray-600 flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="paste-mode" value="replace" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                        Thay thế tất cả
                      </label>
                    </div>
                  </>
                )}
              </div>

              {/* ── Column mapping editor ── */}
              {parsed && showMapper && (
                <div className="border border-blue-200 rounded-lg bg-blue-50/30 overflow-hidden">
                  {/* panel header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border-b border-blue-200">
                    <span className="text-xs font-semibold text-blue-800">
                      🔧 Mapping cột — {parsed.colCount} cột Excel → chọn trường đích
                    </span>
                    <button
                      className="text-[10px] text-blue-600 hover:underline"
                      onClick={resetToAuto}
                    >
                      ↩ Reset về tự động
                    </button>
                  </div>

                  {/* mapping grid */}
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {sortedEntries(colMap).map(([ci, currentKey]) => {
                      const srcLabel = parsed.isHeader
                        ? (parsed.headerRow[Number(ci)] || `Cột ${Number(ci) + 1}`)
                        : `Cột ${Number(ci) + 1}`
                      return (
                        <div
                          key={ci}
                          className={`flex items-center gap-1.5 bg-white rounded border px-2 py-1 ${
                            currentKey ? 'border-blue-200' : 'border-gray-200'
                          }`}
                        >
                          {/* source column label */}
                          <span
                            className="text-[10px] text-gray-500 truncate shrink-0"
                            style={{ maxWidth: 96 }}
                            title={srcLabel}
                          >
                            {srcLabel}
                          </span>

                          <span className="text-gray-300 text-xs shrink-0">→</span>

                          {/* target field selector */}
                          <select
                            className={`text-[10px] rounded px-1 py-0.5 border flex-1 min-w-0 ${
                              currentKey
                                ? 'border-blue-300 text-blue-800 bg-blue-50'
                                : 'border-gray-200 text-gray-400'
                            }`}
                            value={currentKey}
                            onChange={e => updateCol(ci, e.target.value)}
                          >
                            <option value="">(Bỏ qua)</option>
                            {fields.map(f => (
                              <option key={f.key} value={f.key}>
                                {f.label}{mappedKeys.has(f.key) && f.key !== currentKey ? ' ✓' : ''}
                              </option>
                            ))}
                          </select>

                          {/* clear button */}
                          {currentKey && (
                            <button
                              type="button"
                              className="text-gray-300 hover:text-red-400 text-xs shrink-0 leading-none"
                              title="Bỏ qua cột này"
                              onClick={() => updateCol(ci, '')}
                            >✕</button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* quick legend */}
                  <div className="px-3 pb-2 flex gap-3 text-[10px] text-gray-400">
                    <span><span className="text-blue-600 font-medium">✓</span> = đã dùng bởi cột khác (chọn sẽ tự chuyển)</span>
                    <span>Chọn <em>(Bỏ qua)</em> để bỏ qua cột đó</span>
                  </div>
                </div>
              )}

              {/* ── Preview table ── */}
              {parsed && items.length > 0 && (() => {
                const visibleCols = sortedEntries(colMap).filter(([, k]) => k !== '')
                return (
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500">
                      Xem trước {Math.min(items.length, 8)}/{items.length} dòng:
                    </span>
                    <div className="overflow-auto max-h-52 border border-gray-200 rounded text-xs">
                      <table className="w-full border-collapse">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {visibleCols.map(([ci, key]) => (
                              <th
                                key={ci}
                                className="px-2 py-1.5 text-left font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap"
                              >
                                {fields.find(f => f.key === key)?.label || key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {items.slice(0, 8).map((item, ri) => (
                            <tr key={ri} className={ri % 2 ? 'bg-gray-50' : ''}>
                              {visibleCols.map(([ci, key]) => (
                                <td
                                  key={ci}
                                  className="px-2 py-1 border-b border-gray-100 text-gray-700 whitespace-nowrap max-w-[160px] truncate"
                                >
                                  {String(item[key] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {items.length > 8 && (
                            <tr>
                              <td
                                colSpan={visibleCols.length}
                                className="px-2 py-1.5 text-gray-400 text-center italic"
                              >
                                … và {items.length - 8} dòng nữa
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}

              {parsed && items.length === 0 && mappedCount === 0 && (
                <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-3 py-2">
                  ⚠ Không có cột nào được map. Nhấn 🔧 để gán cột thủ công.
                </p>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2 shrink-0">
              <button className="btn-secondary text-sm" onClick={close}>Hủy</button>
              <button
                className="btn-primary text-sm"
                onClick={confirm}
                disabled={!items.length}
              >
                ✅ Import {items.length ? `${items.length} dòng` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
