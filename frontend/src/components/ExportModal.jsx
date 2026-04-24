import React, { useState } from 'react'

/**
 * ExportModal — collects custom info before exporting a PDF report.
 *
 * Props:
 *   type         'inventory' | 'sizing'
 *   defaultTitle  string — placeholder for the report title field
 *   onExport(params)  called with { report_title, prepared_by, department, custom_note, include_diagrams? }
 *   onClose()     close without exporting
 */
export default function ExportModal({ type = 'inventory', defaultTitle = '', onExport, onClose }) {
  const [reportTitle, setReportTitle]   = useState('')
  const [preparedBy, setPreparedBy]     = useState('')
  const [department, setDepartment]     = useState('')
  const [customNote, setCustomNote]     = useState('')
  const [includeDiagrams, setIncludeDiagrams] = useState(true)

  const handleExport = () => {
    const params = {}
    if (reportTitle.trim())  params.report_title  = reportTitle.trim()
    if (preparedBy.trim())   params.prepared_by   = preparedBy.trim()
    if (department.trim())   params.department    = department.trim()
    if (customNote.trim())   params.custom_note   = customNote.trim()
    if (type === 'inventory') params.include_diagrams = includeDiagrams
    onExport(params)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between ${type === 'inventory' ? 'bg-blue-600' : 'bg-emerald-600'} text-white`}>
          <div>
            <p className="font-bold text-base">📄 Xuất báo cáo PDF</p>
            <p className="text-xs opacity-75 mt-0.5">
              {type === 'inventory' ? 'Inventory Report' : 'Sizing Report'} — Tuỳ chỉnh thông tin trước khi xuất
            </p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-gray-500">Tất cả trường bên dưới đều tuỳ chọn. Để trống sẽ dùng giá trị mặc định.</p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Tiêu đề báo cáo
              <span className="font-normal text-gray-400 ml-1">(override mặc định)</span>
            </label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder={defaultTitle || (type === 'inventory' ? 'INFRASTRUCTURE INVENTORY REPORT' : 'INFRASTRUCTURE SIZING REPORT')}
              value={reportTitle}
              onChange={e => setReportTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Người lập báo cáo</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Tên người lập..."
                value={preparedBy}
                onChange={e => setPreparedBy(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phòng ban / Đơn vị</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="IT Dept, Presales..."
                value={department}
                onChange={e => setDepartment(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ghi chú bổ sung</label>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              placeholder="Nội dung bổ sung sẽ xuất hiện trong báo cáo..."
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
            />
          </div>

          {type === 'inventory' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={includeDiagrams}
                onChange={e => setIncludeDiagrams(e.target.checked)}
              />
              <span className="text-sm text-gray-700">Đính kèm Diagrams / Sơ đồ hạ tầng vào PDF</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={handleExport}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${
              type === 'inventory'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            📄 Xuất PDF
          </button>
        </div>
      </div>
    </div>
  )
}
