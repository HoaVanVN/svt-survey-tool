import { useEffect, useState } from 'react'
import { referenceApi } from '../api'

let _cache = null
let _promise = null

export function useRefs() {
  const [refs, setRefs] = useState(_cache || {})

  useEffect(() => {
    if (_cache) { setRefs(_cache); return }
    if (!_promise) {
      _promise = referenceApi.getAll().then(r => {
        const { _labels, ...data } = r.data
        _cache = data
        return data
      })
    }
    _promise.then(data => setRefs(data))
  }, [])

  return refs
}

export function invalidateRefs() {
  _cache = null
  _promise = null
}
