import React from 'react'

const STATUS_OPTIONS = ['Using', 'Standby', 'EOL', 'Decommissioned', 'Phased-out']

export default function InventoryTable({ fields, items, onChange }) {
  const add = () => {
    const blank = {}
    fields.forEach(f => { blank[f.key] = f.default ?? '' })
    blank.status = 'Using'
    onChange([...items, blank])
  }

  const remove = (i) => onChange(items.filter((_, j) => j !== i))

  const set = (i, key, val) => {
    const next = [...items]
    next[i] = { ...next[i], [key]: val }
    onChange(next)
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button className="btn-secondary text-xs" onClick={add}>+ Thêm thiết bị</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="table-hdr text-center w-8">#</th>
              {fields.map(f => (
                <th key={f.key} className="table-hdr" style={{ minWidth: f.width || 90 }}>{f.label}</th>
              ))}
              <th className="table-hdr w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="table-cell text-center text-gray-400">{i + 1}</td>
                {fields.map(f => (
                  <td key={f.key} className="table-cell p-1">
                    {f.type === 'select' ? (
                      <select
                        className="text-xs border-gray-200 rounded px-1 py-1 border w-full"
                        value={item[f.key] ?? f.default ?? ''}
                        onChange={e => set(i, f.key, e.target.value)}
                      >
                        {(f.key === 'status' ? STATUS_OPTIONS : f.options || []).map(o => (
                          <option key={o}>{o}</option>
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
                  <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <p className="text-center text-gray-400 py-8 text-sm">Chưa có thiết bị nào. Nhấn "+ Thêm thiết bị" để bắt đầu.</p>
        )}
      </div>
    </div>
  )
}
