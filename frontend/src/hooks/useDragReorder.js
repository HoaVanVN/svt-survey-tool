import { useRef, useState } from 'react'

/**
 * Native HTML5 drag-and-drop reorder for any list.
 *
 * Usage:
 *   const drag = useDragReorder(items, onChange)
 *   <tr draggable onDragStart={drag.onDragStart(i)} onDragOver={drag.onDragOver(i)}
 *       onDrop={drag.onDrop(i)} onDragEnd={drag.onDragEnd}
 *       className={drag.dragOver === i ? 'drag-over' : ''}>
 *     <td {...drag.handleProps} className="drag-handle">⠿</td>
 *     ...
 *
 * Returns:
 *   dragOver       – index currently dragged over (for visual highlight)
 *   onDragStart(i) – factory returning dragstart handler for row i
 *   onDragOver(i)  – factory returning dragover handler for row i
 *   onDrop(i)      – factory returning drop handler for row i
 *   onDragEnd      – dragend handler (clears state)
 *   handleProps    – spread onto the handle <td> to prevent text selection
 */
export function useDragReorder(items, onChange) {
  const srcRef  = useRef(null)
  const [dragOver, setDragOver] = useState(null)

  const onDragStart = (i) => (e) => {
    srcRef.current = i
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(i))
    // Style the ghost image
    e.currentTarget.classList.add('opacity-50')
  }

  const onDragOver = (i) => (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOver !== i) setDragOver(i)
  }

  const onDrop = (i) => (e) => {
    e.preventDefault()
    const from = srcRef.current
    if (from === null || from === undefined || from === i) {
      setDragOver(null)
      return
    }
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(i, 0, moved)
    onChange(next)
    srcRef.current = null
    setDragOver(null)
  }

  const onDragEnd = (e) => {
    e.currentTarget.classList.remove('opacity-50')
    srcRef.current = null
    setDragOver(null)
  }

  const onDragLeave = () => setDragOver(null)

  // Spread onto the <td> or <span> that acts as the handle
  const handleProps = {
    onMouseDown: (e) => e.preventDefault(),   // prevent text-selection on mousedown
    style: { cursor: 'grab', userSelect: 'none' },
  }

  return { dragOver, onDragStart, onDragOver, onDrop, onDragEnd, onDragLeave, handleProps }
}
