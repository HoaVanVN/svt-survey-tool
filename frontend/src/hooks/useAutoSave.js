import { useEffect, useRef, useState } from 'react'

/**
 * Auto-saves data by calling saveFn every `interval` ms when dirty.
 * Also intercepts beforeunload to warn the user about unsaved changes.
 *
 * @param {*}        data      - reactive data to track (any JSON-serialisable value)
 * @param {Function} saveFn    - async () => void — called when auto-save fires
 * @param {object}   opts
 * @param {number}   opts.interval  - ms between auto-save checks (default 60 000)
 * @param {boolean}  opts.enabled   - set false to disable (default true)
 * @returns {{ isDirty: boolean, lastSaved: Date|null, markClean: () => void }}
 */
export function useAutoSave(data, saveFn, { interval = 60_000, enabled = true } = {}) {
  // These refs let the timer always read the latest values without recreating itself
  const baseRef   = useRef(JSON.stringify(data))  // last-persisted snapshot
  const dataRef   = useRef(data)
  const saveFnRef = useRef(saveFn)
  const savingRef = useRef(false)

  const [isDirty,   setIsDirty]   = useState(false)
  const [lastSaved, setLastSaved] = useState(null)

  // Keep refs current on every render
  useEffect(() => { dataRef.current  = data   }, [data])
  useEffect(() => { saveFnRef.current = saveFn }, [saveFn])

  // Recompute isDirty whenever data changes
  useEffect(() => {
    setIsDirty(JSON.stringify(data) !== baseRef.current)
  }, [data])

  // Stable timer — never recreated when data/saveFn change (uses refs)
  useEffect(() => {
    if (!enabled) return
    const timer = setInterval(async () => {
      const snap = JSON.stringify(dataRef.current)
      if (snap === baseRef.current || savingRef.current) return
      savingRef.current = true
      try {
        await saveFnRef.current()
        baseRef.current = snap
        setLastSaved(new Date())
        setIsDirty(false)
      } catch (e) {
        console.warn('[useAutoSave] auto-save failed:', e)
      } finally {
        savingRef.current = false
      }
    }, interval)
    return () => clearInterval(timer)
  }, [interval, enabled])

  // Warn browser on tab-close / navigation when dirty
  useEffect(() => {
    if (!isDirty) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  /** Call after a successful manual save to sync the baseline. */
  const markClean = () => {
    baseRef.current = JSON.stringify(dataRef.current)
    setIsDirty(false)
    setLastSaved(new Date())
  }

  return { isDirty, lastSaved, markClean }
}
