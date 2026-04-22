import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { diagrams as diagramsApi } from '../../api'

export default function DiagramsPage() {
  const { id } = useParams()
  const fileRef = useRef(null)
  const [list, setList] = useState([])
  const [uploading, setUploading] = useState(false)
  const [viewItem, setViewItem] = useState(null) // { id, filename, label, content_type, data }
  const [editLabel, setEditLabel] = useState(null) // { id, label }

  const reload = () =>
    diagramsApi.list(id).then(r => setList(r.data)).catch(() => setList([]))

  useEffect(() => { reload() }, [id])

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        form.append('label', file.name.replace(/\.[^.]+$/, ''))
        await diagramsApi.upload(id, form)
      }
      toast.success(`Đã upload ${files.length} sơ đồ`)
      reload()
    } catch (err) {
      toast.error('Lỗi khi upload: ' + (err.response?.data?.detail || err.message))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleView = async (item) => {
    try {
      const r = await diagramsApi.getData(id, item.id)
      setViewItem(r.data)
    } catch {
      toast.error('Không thể tải hình ảnh')
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Xóa sơ đồ "${item.label || item.filename}"?`)) return
    try {
      await diagramsApi.remove(id, item.id)
      toast.success('Đã xóa')
      if (viewItem?.id === item.id) setViewItem(null)
      reload()
    } catch {
      toast.error('Lỗi khi xóa')
    }
  }

  const handleLabelSave = async () => {
    if (!editLabel) return
    try {
      await diagramsApi.updateLabel(id, editLabel.id, editLabel.label)
      toast.success('Đã cập nhật tên')
      setEditLabel(null)
      reload()
    } catch {
      toast.error('Lỗi khi lưu tên')
    }
  }

  const imgSrc = (item) => `data:${item.content_type};base64,${item.data}`

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-gray-800">
            🗺️ System Diagrams
            <span className="text-gray-400 text-sm font-normal ml-2">({list.length} sơ đồ)</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Upload và lưu trữ sơ đồ hệ thống, kiến trúc mạng, topology…</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileRef}
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <button
            className="btn-secondary text-xs"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? '⏳ Đang upload...' : '📤 Upload Diagram'}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {list.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🗺️</div>
          <p className="text-sm font-medium">Chưa có sơ đồ nào</p>
          <p className="text-xs mt-1">Click "Upload Diagram" để thêm sơ đồ hệ thống</p>
        </div>
      )}

      {/* Grid */}
      {list.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {list.map(item => (
            <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group">
              <div
                className="h-28 bg-gray-50 flex items-center justify-center cursor-pointer relative"
                onClick={() => handleView(item)}
              >
                <DiagramThumbnail diagramId={item.id} customerId={id} contentType={item.content_type} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-white bg-black/50 rounded px-2 py-1 text-xs transition-opacity">🔍 Xem</span>
                </div>
              </div>
              <div className="p-2">
                {editLabel?.id === item.id ? (
                  <div className="flex gap-1">
                    <input
                      className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 min-w-0"
                      value={editLabel.label}
                      autoFocus
                      onChange={e => setEditLabel(p => ({ ...p, label: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleLabelSave(); if (e.key === 'Escape') setEditLabel(null) }}
                    />
                    <button onClick={handleLabelSave} className="text-green-600 hover:text-green-700 text-xs">✓</button>
                    <button onClick={() => setEditLabel(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 justify-between">
                    <p
                      className="text-xs text-gray-700 font-medium truncate cursor-pointer hover:text-blue-600"
                      title={item.label || item.filename}
                      onClick={() => setEditLabel({ id: item.id, label: item.label || item.filename })}
                    >
                      {item.label || item.filename}
                    </p>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-red-300 hover:text-red-500 text-xs shrink-0 ml-1"
                      title="Xóa"
                    >✕</button>
                  </div>
                )}
                {item.uploaded_at && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(item.uploaded_at).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox modal */}
      {viewItem && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setViewItem(null)}
        >
          <div
            className="bg-white rounded-lg max-w-5xl max-h-[90vh] overflow-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
              <span className="font-medium text-gray-800 text-sm">{viewItem.label || viewItem.filename}</span>
              <div className="flex gap-2">
                <a
                  href={imgSrc(viewItem)}
                  download={viewItem.filename}
                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                >⬇️ Tải xuống</a>
                <button
                  onClick={() => setViewItem(null)}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
                >✕</button>
              </div>
            </div>
            <div className="p-4">
              <img
                src={imgSrc(viewItem)}
                alt={viewItem.label || viewItem.filename}
                className="max-w-full h-auto"
                style={{ maxHeight: 'calc(90vh - 80px)' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Lazy-loading thumbnail: fetches data only when rendered
function DiagramThumbnail({ diagramId, customerId, contentType }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    import('../../api').then(({ diagrams }) =>
      diagrams.getData(customerId, diagramId)
        .then(r => setSrc(`data:${r.data.content_type};base64,${r.data.data}`))
        .catch(() => {})
    )
  }, [diagramId, customerId])

  if (!src) return <span className="text-3xl text-gray-300">🖼️</span>
  return <img src={src} alt="" className="w-full h-full object-contain p-1" />
}
