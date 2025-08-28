"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSettings } from "@/lib/settings-context"
import type { Category } from "@/lib/settings-context"

interface CategorySelectorProps {
  currentCategory: string
  onCategoryChange: (newCategory: string) => void
  className?: string
}

export function CategorySelector({ currentCategory, onCategoryChange, className }: CategorySelectorProps) {
  const { settings } = useSettings()

  const availableCategories = settings.categories.length > 0 
    ? settings.categories 
    : [{ id: "na", name: "N/A", color: "#6b7280" }] as Category[]


  return (
    <Select value={currentCategory} onValueChange={onCategoryChange}>
      <SelectTrigger className={`w-auto h-auto p-1 border-none bg-transparent hover:bg-muted ${className}`}>
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent>
        {availableCategories.map((category) => (
          <SelectItem 
            key={category.id}
            value={category.name}
            className="flex items-center gap-2"
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: category.color || '#6b7280' }}
              />
              <span>{category.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}