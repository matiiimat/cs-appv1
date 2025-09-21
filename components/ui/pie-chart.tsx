"use client"

import React from "react"

type PieDatum = {
  label: string
  value: number
  color: string
}

export function PieChart({ data, totalLabel = "Total" }: { data: PieDatum[]; totalLabel?: string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const radius = 60
  const circumference = 2 * Math.PI * radius

  let cumulative = 0
  const arcs = data.map((d) => {
    const fraction = total > 0 ? d.value / total : 0
    const length = fraction * circumference
    const dasharray = `${length} ${circumference - length}`
    const dashoffset = circumference - cumulative * circumference
    cumulative += fraction
    return { ...d, dasharray, dashoffset }
  })

  return (
    <div className="flex items-center gap-6">
      <svg width={160} height={160} viewBox="0 0 160 160">
        <g transform="translate(80,80)">
          <circle r={radius} fill="transparent" strokeWidth={16} stroke="#e5e7eb" />
          {arcs.map((a, idx) => (
            <circle
              key={idx}
              r={radius}
              fill="transparent"
              stroke={a.color}
              strokeWidth={16}
              strokeDasharray={a.dasharray}
              strokeDashoffset={a.dashoffset}
              transform="rotate(-90)"
              strokeLinecap="butt"
            />
          ))}
          <text y={-6} textAnchor="middle" fontSize="14" className="fill-current">
            {totalLabel}
          </text>
          <text y={14} textAnchor="middle" fontSize="16" fontWeight={700} className="fill-current">
            {total}
          </text>
        </g>
      </svg>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {data.map((d, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block w-3 h-3 rounded" style={{ background: d.color }} />
              <span className="truncate" title={d.label}>{d.label}</span>
            </div>
            <div className="tabular-nums text-muted-foreground">{d.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

