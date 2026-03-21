import { useEffect, useRef } from 'react'
import { createChart } from 'lightweight-charts'

export default function StockChart({ data }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: { background: { color: '#111827' }, textColor: '#9CA3AF' },
      grid: { vertLines: { color: '#1F2937' }, horzLines: { color: '#1F2937' } },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: '#374151' },
      timeScale: { borderColor: '#374151', timeVisible: true },
      width: containerRef.current.clientWidth,
      height: 300,
    })

    const series = chart.addAreaSeries({
      topColor: 'rgba(16, 185, 129, 0.3)',
      bottomColor: 'rgba(16, 185, 129, 0.02)',
      lineColor: '#10B981',
      lineWidth: 2,
    })

    const parsed = (data || [])
      .map((item) => {
        if (item.formatted_date) {
          const ts = Math.floor(new Date(item.formatted_date).getTime() / 1000)
          if (!isNaN(ts)) return { time: ts, value: parseFloat(item.value) || 0 }
        }
        return null
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time)

    if (parsed.length > 0) {
      series.setData(parsed)
      chart.timeScale().fitContent()
    }

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth })
    }
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize); chart.remove() }
  }, [data])

  return <div ref={containerRef} />
}
