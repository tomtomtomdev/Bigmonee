import { useState, useEffect, useCallback, useRef } from 'react'

export function useStockData(fetchFn, deps = [], interval = 30000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRef = useRef(fetchFn)
  useEffect(() => { fetchRef.current = fetchFn })

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const result = await fetchRef.current()
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, interval)
    return () => clearInterval(timer)
  }, [refresh, interval])

  // Re-fetch when deps change (skip initial mount handled above)
  const mounted = useRef(false)
  useEffect(() => {
    if (mounted.current) refresh()
    else mounted.current = true
  }, deps)

  return { data, loading, error, refresh }
}
