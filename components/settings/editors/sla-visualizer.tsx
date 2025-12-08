"use client"

import { useSettings } from "@/lib/settings-context"
import { Input } from "@/components/ui/input"

export function SLAVisualizer() {
  const { settings, updateSettings } = useSettings()
  const { greenHours, yellowHours, redHours } = settings.messageAgeThresholds

  const handleGreenChange = (value: number) => {
    const clamped = Math.max(1, Math.min(168, value))
    const newThresholds = { ...settings.messageAgeThresholds, greenHours: clamped }
    if (clamped > newThresholds.yellowHours) {
      newThresholds.yellowHours = clamped
    }
    if (newThresholds.yellowHours > newThresholds.redHours) {
      newThresholds.redHours = newThresholds.yellowHours
    }
    updateSettings({ messageAgeThresholds: newThresholds })
  }

  const handleYellowChange = (value: number) => {
    const clamped = Math.max(greenHours, Math.min(168, value))
    const newThresholds = { ...settings.messageAgeThresholds, yellowHours: clamped }
    if (clamped > newThresholds.redHours) {
      newThresholds.redHours = clamped
    }
    updateSettings({ messageAgeThresholds: newThresholds })
  }

  const handleRedChange = (value: number) => {
    const clamped = Math.max(yellowHours, Math.min(168, value))
    updateSettings({
      messageAgeThresholds: { ...settings.messageAgeThresholds, redHours: clamped },
    })
  }

  // Calculate percentages for visualization (max 72 hours display)
  const maxDisplay = Math.max(72, redHours + 12)
  const greenPct = (greenHours / maxDisplay) * 100
  const yellowPct = (yellowHours / maxDisplay) * 100
  const redPct = (redHours / maxDisplay) * 100

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Set response time thresholds to track message urgency. Messages change color as they age.
      </p>

      {/* Visual Timeline */}
      <div className="relative pt-8 pb-4">
        {/* Timeline bar */}
        <div className="h-3 rounded-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500 relative overflow-hidden">
          {/* Threshold markers */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/80"
            style={{ left: `${greenPct}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/80"
            style={{ left: `${yellowPct}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/80"
            style={{ left: `${redPct}%` }}
          />
        </div>

        {/* Labels above timeline */}
        <div
          className="absolute top-0 text-xs font-medium text-green-600 dark:text-green-400 -translate-x-1/2"
          style={{ left: `${greenPct / 2}%` }}
        >
          Fresh
        </div>
        <div
          className="absolute top-0 text-xs font-medium text-amber-600 dark:text-amber-400 -translate-x-1/2"
          style={{ left: `${(greenPct + yellowPct) / 2}%` }}
        >
          Aging
        </div>
        <div
          className="absolute top-0 text-xs font-medium text-red-600 dark:text-red-400 -translate-x-1/2"
          style={{ left: `${(yellowPct + redPct) / 2}%` }}
        >
          Overdue
        </div>

        {/* Hour markers below */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>0h</span>
          <span>{greenHours}h</span>
          <span>{yellowHours}h</span>
          <span>{redHours}h+</span>
        </div>
      </div>

      {/* Input Controls */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <label className="text-sm font-medium">Fresh</label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={168}
              value={greenHours}
              onChange={(e) => handleGreenChange(parseInt(e.target.value) || 1)}
              className="w-20 text-center"
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
          <p className="text-xs text-muted-foreground">Up to {greenHours}h</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <label className="text-sm font-medium">Aging</label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={greenHours}
              max={168}
              value={yellowHours}
              onChange={(e) => handleYellowChange(parseInt(e.target.value) || greenHours)}
              className="w-20 text-center"
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
          <p className="text-xs text-muted-foreground">{greenHours}–{yellowHours}h</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <label className="text-sm font-medium">Overdue</label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={yellowHours}
              max={168}
              value={redHours}
              onChange={(e) => handleRedChange(parseInt(e.target.value) || yellowHours)}
              className="w-20 text-center"
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
          <p className="text-xs text-muted-foreground">{redHours}h+</p>
        </div>
      </div>
    </div>
  )
}
