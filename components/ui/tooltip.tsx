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
  side?: 'top' | 'right' | 'bottom' | 'left' // Which side to show tooltip
}

export function Tooltip({ children, content, className, delay = 0, inline = false, side = 'right' }: TooltipProps) {
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

        let top = 0, left = 0

        switch (side) {
          case 'top':
            top = rect.top + window.scrollY - 8 // 8px above
            left = rect.left + window.scrollX + (rect.width / 2) // centered
            break
          case 'bottom':
            top = rect.bottom + window.scrollY + 8 // 8px below
            left = rect.left + window.scrollX + (rect.width / 2) // centered
            break
          case 'left':
            top = rect.top + window.scrollY
            left = rect.left + window.scrollX - 8 // 8px to the left
            break
          case 'right':
          default:
            top = rect.top + window.scrollY
            left = rect.right + window.scrollX + 8 // 8px to the right
            break
        }

        setPosition({ top, left })
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
            // Arrow styling based on side
            side === 'top' && "after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-l-4 after:border-r-4 after:border-t-4 after:border-l-transparent after:border-r-transparent after:border-t-gray-900",
            side === 'bottom' && "after:content-[''] after:absolute after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-l-4 after:border-r-4 after:border-b-4 after:border-l-transparent after:border-r-transparent after:border-b-gray-900",
            side === 'left' && "after:content-[''] after:absolute after:top-2 after:left-full after:border-t-4 after:border-b-4 after:border-l-4 after:border-t-transparent after:border-b-transparent after:border-l-gray-900",
            side === 'right' && "after:content-[''] after:absolute after:top-2 after:right-full after:border-t-4 after:border-b-4 after:border-r-4 after:border-t-transparent after:border-b-transparent after:border-r-gray-900",
            className
          )}
          style={{
            whiteSpace: 'normal',
            top: position.top,
            left: side === 'top' || side === 'bottom' ? position.left - 50 : position.left, // Center for top/bottom
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  )
}