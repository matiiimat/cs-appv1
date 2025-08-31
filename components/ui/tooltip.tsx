"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: string
  className?: string
}

export function Tooltip({ children, content, className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div 
          className={cn(
            "absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-md shadow-lg",
            "bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2",
            "max-w-sm w-max",
            "after:content-[''] after:absolute after:top-full after:left-1/2 after:transform after:-translate-x-1/2",
            "after:border-l-4 after:border-r-4 after:border-t-4 after:border-l-transparent after:border-r-transparent after:border-t-gray-900",
            className
          )}
          style={{ whiteSpace: 'normal' }}
        >
          {content}
        </div>
      )}
    </div>
  )
}