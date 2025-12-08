"use client"

import { useState } from "react"
import { useSettings } from "@/lib/settings-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, GripVertical } from "lucide-react"

const colorPalette = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#64748b", // slate
]

export function CategoryEditor() {
  const { settings, updateCategory, addCategory, deleteCategory } = useSettings()
  const [editingColorId, setEditingColorId] = useState<string | null>(null)

  const handleAddCategory = () => {
    if (settings.categories.length >= 10) {
      return
    }
    const usedColors = new Set(settings.categories.map((c) => c.color))
    const availableColor = colorPalette.find((c) => !usedColors.has(c)) || colorPalette[0]
    addCategory({
      name: "New Category",
      color: availableColor,
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Organize incoming messages into categories for better workflow management.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddCategory}
          disabled={settings.categories.length >= 10}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Category Count */}
      <div className="text-xs text-muted-foreground">
        {settings.categories.length}/10 categories
      </div>

      {/* Category List */}
      {settings.categories.length === 0 ? (
        <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg text-center">
          No categories configured. Default categories will be used for AI categorization.
        </div>
      ) : (
        <div className="space-y-2">
          {settings.categories.map((category) => (
            <div
              key={category.id}
              className="group flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
            >
              {/* Drag Handle (visual only for now) */}
              <div className="text-muted-foreground/50 cursor-grab">
                <GripVertical className="h-4 w-4" />
              </div>

              {/* Color Picker */}
              <div className="relative">
                <button
                  onClick={() =>
                    setEditingColorId(editingColorId === category.id ? null : category.id)
                  }
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                  style={{ backgroundColor: category.color || "#64748b" }}
                  aria-label="Change color"
                />

                {/* Color Palette Popover */}
                {editingColorId === category.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setEditingColorId(null)}
                    />
                    <div className="absolute left-0 top-full mt-2 z-20 p-2 bg-card border border-border rounded-lg shadow-lg">
                      <div className="grid grid-cols-4 gap-1.5">
                        {colorPalette.map((color) => (
                          <button
                            key={color}
                            onClick={() => {
                              updateCategory(category.id, { color })
                              setEditingColorId(null)
                            }}
                            className={`
                              w-6 h-6 rounded-full border-2 transition-transform hover:scale-110
                              ${category.color === color ? "border-foreground scale-110" : "border-transparent"}
                            `}
                            style={{ backgroundColor: color }}
                            aria-label={`Select ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Category Name */}
              <Input
                value={category.name}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 20)
                  updateCategory(category.id, { name: value })
                }}
                placeholder="Category name"
                maxLength={20}
                className="flex-1 bg-transparent border-transparent hover:border-border focus:border-border transition-colors"
              />

              {/* Delete Button */}
              {settings.categories.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCategory(category.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
