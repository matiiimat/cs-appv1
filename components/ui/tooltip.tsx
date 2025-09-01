"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: string
  className?: string
  delay?: number // Delay in milliseconds before tooltip appears
  inline?: boolean // Use inline-block instead of block w-full
}

export function Tooltip({ children, content, className, delay = 0, inline = false }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const elementRef = React.useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect()
        setPosition({
          top: rect.top + window.scrollY,
          left: rect.right + window.scrollX + 8, // 8px offset to the right
        })
      }
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      <div 
        ref={elementRef}
        className={inline ? "relative inline-block" : "relative block w-full"}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {isVisible && typeof window !== 'undefined' && createPortal(
        <div 
          className={cn(
            "fixed z-[9999] px-3 py-2 text-sm text-white bg-gray-900 rounded-md shadow-lg",
            "max-w-sm w-max",
            // Arrow pointing left
            "after:content-[''] after:absolute after:top-2 after:right-full after:border-t-4 after:border-b-4 after:border-r-4 after:border-t-transparent after:border-b-transparent after:border-r-gray-900",
            className
          )}
          style={{ 
            whiteSpace: 'normal',
            top: position.top,
            left: position.left,
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  )
}