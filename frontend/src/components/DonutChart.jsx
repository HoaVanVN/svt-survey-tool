import React from 'react'

export default function DonutChart({ data, size = 180, label }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <span className="text-gray-300 text-xs text-center">Không có dữ liệu</span>
    </div>
  )

  const cx = size / 2, cy = size / 2
  const R = size * 0.38, r = size * 0.22
  let angle = -Math.PI / 2

  const slices = data.map(d => {
    const sweep = (d.value / total) * Math.PI * 2
    const end = angle + sweep
    const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle)
    const x2 = cx + R * Math.cos(end), y2 = cy + R * Math.sin(end)
    const ix1 = cx + r * Math.cos(end), iy1 = cy + r * Math.sin(end)
    const ix2 = cx + r * Math.cos(angle), iy2 = cy + r * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    const path = `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${ix1},${iy1} A${r},${r} 0 ${large},0 ${ix2},${iy2} Z`
    const mid = angle + sweep / 2
    const lx = cx + (R + r) / 2 * Math.cos(mid)
    const ly = cy + (R + r) / 2 * Math.sin(mid)
    const result = { ...d, path, lx, ly, pct: Math.round(d.value / total * 100) }
    angle = end
    return result
  })

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="1.5">
            <title>{s.label}: {s.value} ({s.pct}%)</title>
          </path>
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={size * 0.13} fontWeight="bold" fill="#1f2937">{total}</text>
        <text x={cx} y={cy + size * 0.09} textAnchor="middle" fontSize={size * 0.07} fill="#6b7280">{label || 'thiết bị'}</text>
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-gray-600">{s.label}</span>
            <span className="font-semibold text-gray-800">{s.value}</span>
            <span className="text-gray-400">({s.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}
