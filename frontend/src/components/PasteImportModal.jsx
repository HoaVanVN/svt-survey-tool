import React, { useState, useCallback } from 'react'

// ── TSV parser ────────────────────────────────────────────────────────────────
function parseTSV(text) {
  return text
    .trim()
    .split('\n')
    .map(line => line.split('\t').map(c => c.trim()))
    .filter(row => row.some(c => c !== ''))
}

// Decide whether the first row looks like a header row
function detectHeaders(firstRow, fields) {
  const norm = firstRow.map(h => h.toLowerCase())
  const fieldTokens = fields.flatMap(f => [
    f.label.toLowerCase(),
    f.key.toLowerCase(),
    ...(f.pasteAlts || []).map(a => a.toLowerCase()),
  ])
  const matches = norm.filter(h => fieldTokens.some(t => t === h || t.includes(h) || h.includes(t) && h.length > 2))
  return matches.length >= Math.min(2, Math.ceil(firstRow.length * 0.35))
}

// Build colIndex → fieldKey map from a header row
function buildColMap(headerRow, fields) {
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

// Build positional colMap (col 0 → field 0, etc.)
function buildPositionalMap(fields) {
  return Object.fromEntries(fields.map((f, i) => [i, f.key]))
}

// Convert a TSV row to a data item
function rowToItem(cols, colMap, fields, defaultItem) {
  const item = { ...defaultItem }
  Object.entries(colMap).forEach(([ci, key]) => {
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function PasteImportModal({
  fields,
  defaultItem = {},
  onImport,
  buttonLabel = '📋 Paste từ Excel',
  buttonClassName = 'btn-secondary text-xs',
}) {
  const [open, setOpen] = useState(false)
  const [raw, setRaw] = useState('')
  const [preview, setPreview] = useState(null)
  const [mode, setMode] = useState('append') // 'append' | 'replace'

  const parse = useCallback(() => {
    const rows = parseTSV(raw)
    if (!rows.length) return

    const isHeader = detectHeaders(rows[0], fields)
    const colMap = isHeader ? buildColMap(rows[0], fields) : buildPositionalMap(fields)
    const dataRows = isHeader ? rows.slice(1) : rows
    const items = dataRows
      .filter(r => r.some(c => c))
      .map(r => rowToItem(r, colMap, fields, defaultItem))

    setPreview({ items, colMap, isHeader, headerRow: isHeader ? rows[0] : [] })
  }, [raw, fields, defaultItem])

  const confirm = () => {
    if (preview?.items?.length) {
      onImport(preview.items, mode)
      close()
    }
  }

  const close = () => { setOpen(false); setRaw(''); setPreview(null) }

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
            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-gray-800">📋 Import từ Excel</h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3 overflow-auto flex-1">
              <p className="text-xs text-gray-500">
                Trong Excel, chọn các ô muốn import (kể cả dòng tiêu đề nếu có) → Copy (Ctrl+C) → Dán vào đây.
                Hệ thống sẽ tự động nhận diện tiêu đề và khớp các cột.
              </p>

              <textarea
                className="w-full h-32 text-xs font-mono border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
                placeholder={"Dán dữ liệu Excel vào đây (Ctrl+V)…\n\nVí dụ có tiêu đề:\nTên\tvCPU\tRAM\nApp Server\t8\t32\n\nVí dụ không tiêu đề (khớp theo thứ tự cột):\nApp Server\t8\t32"}
                value={raw}
                onChange={e => { setRaw(e.target.value); setPreview(null) }}
                onPaste={() => setTimeout(parse, 30)}
              />

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  className="btn-primary text-xs"
                  onClick={parse}
                  disabled={!raw.trim()}
                >
                  🔍 Phân tích
                </button>
                {preview && (
                  <div className="flex items-center gap-3 ml-auto">
                    <label className="text-xs text-gray-600 flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="paste-mode" value="append" checked={mode === 'append'} onChange={() => setMode('append')} />
                      Thêm vào cuối
                    </label>
                    <label className="text-xs text-gray-600 flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="paste-mode" value="replace" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                      Thay thế tất cả
                    </label>
                  </div>
                )}
              </div>

              {preview && (
                <div className="space-y-2">
                  {/* Status badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-700">
                      Kết quả: {preview.items.length} dòng dữ liệu
                    </span>
                    {preview.isHeader
                      ? <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">✓ Nhận diện dòng tiêu đề</span>
                      : <span className="text-xs text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200">⚠ Khớp theo vị trí cột</span>
                    }
                  </div>

                  {/* Column mapping badges */}
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(preview.colMap).map(([ci, key]) => {
                      const fl = fields.find(f => f.key === key)
                      const srcLabel = preview.isHeader ? (preview.headerRow[Number(ci)] || `Cột ${Number(ci) + 1}`) : `Cột ${Number(ci) + 1}`
                      return (
                        <span key={ci} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                          {srcLabel} → {fl?.label || key}
                        </span>
                      )
                    })}
                    {preview.isHeader && preview.headerRow.map((h, ci) =>
                      preview.colMap[ci] == null && h
                        ? <span key={`u-${ci}`} className="text-[10px] bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 line-through">{h}</span>
                        : null
                    )}
                  </div>

                  {/* Preview table */}
                  <div className="overflow-auto max-h-52 border border-gray-200 rounded text-xs">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {Object.values(preview.colMap).map((key, i) => (
                            <th key={i} className="px-2 py-1.5 text-left font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">
                              {fields.find(f => f.key === key)?.label || key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.items.slice(0, 8).map((item, ri) => (
                          <tr key={ri} className={ri % 2 ? 'bg-gray-50' : ''}>
                            {Object.values(preview.colMap).map((key, ci) => (
                              <td key={ci} className="px-2 py-1 border-b border-gray-100 text-gray-700 whitespace-nowrap max-w-[160px] truncate">
                                {String(item[key] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {preview.items.length > 8 && (
                          <tr>
                            <td colSpan={Object.keys(preview.colMap).length} className="px-2 py-1.5 text-gray-400 text-center italic">
                              … và {preview.items.length - 8} dòng nữa
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2 shrink-0">
              <button className="btn-secondary text-sm" onClick={close}>Hủy</button>
              <button
                className="btn-primary text-sm"
                onClick={confirm}
                disabled={!preview?.items?.length}
              >
                ✅ Import {preview?.items?.length ? `${preview.items.length} dòng` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
