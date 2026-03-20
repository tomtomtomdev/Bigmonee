import { useEffect, useRef } from 'react'
import { createChart } from 'lightweight-charts'

export default function IHSGChart({ data }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#111827' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: '#1F2937' },
        horzLines: { color: '#1F2937' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
      },
      width: containerRef.current.clientWidth,
      height: 400,
    })

    const series = chart.addAreaSeries({
      topColor: 'rgba(16, 185, 129, 0.3)',
      bottomColor: 'rgba(16, 185, 129, 0.02)',
      lineColor: '#10B981',
      lineWidth: 2,
    })

    // Parse chart data - handle multiple formats
    const parsed = parseChartData(data)
    if (parsed.length > 0) {
      series.setData(parsed)
      chart.timeScale().fitContent()
    }

    chartRef.current = chart

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data])

  return <div ref={containerRef} className="chart-container" />
}

function parseChartData(data) {
  if (!data || !Array.isArray(data)) {
    // Try if data is an object with arrays
    if (data?.t && data?.c) {
      return data.t.map((time, i) => ({
        time: typeof time === 'number' ? (time > 1e12 ? Math.floor(time / 1000) : time) : time,
        value: data.c[i],
      }))
    }
    return []
  }

  return data
    .map((item) => {
      // Array format: [timestamp, open, high, low, close, volume]
      if (Array.isArray(item)) {
        const ts = item[0] > 1e12 ? Math.floor(item[0] / 1000) : item[0]
        return { time: ts, value: item[4] ?? item[1] }
      }
      // Object format
      if (item.time || item.timestamp || item.date) {
        let time = item.time || item.timestamp || item.date
        if (typeof time === 'number' && time > 1e12) time = Math.floor(time / 1000)
        return { time, value: item.close ?? item.value ?? item.price }
      }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time)
}
