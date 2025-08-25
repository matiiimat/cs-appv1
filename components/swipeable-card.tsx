"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"

interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft: () => void
  onSwipeRight: () => void
  disabled?: boolean
  className?: string
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
  className = "",
}: SwipeableCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [isHorizontalSwipe, setIsHorizontalSwipe] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const SWIPE_THRESHOLD = 100
  const MAX_ROTATION = 15
  const DIRECTION_THRESHOLD = 10 // Minimum movement to determine swipe direction

  const handleStart = (clientX: number, clientY: number) => {
    if (disabled) return
    setIsDragging(true)
    setStartPos({ x: clientX, y: clientY })
    setIsHorizontalSwipe(false)
  }

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || disabled) return

    const deltaX = clientX - startPos.x
    const deltaY = clientY - startPos.y
    
    // Determine if this is a horizontal swipe
    if (!isHorizontalSwipe && (Math.abs(deltaX) > DIRECTION_THRESHOLD || Math.abs(deltaY) > DIRECTION_THRESHOLD)) {
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY)
      setIsHorizontalSwipe(isHorizontal)
    }
    
    // Only update drag offset if it's a horizontal swipe
    if (isHorizontalSwipe) {
      setDragOffset({ x: deltaX, y: 0 }) // Force Y to 0 for horizontal-only movement
    }
  }

  const handleEnd = () => {
    if (!isDragging || disabled) return

    const { x } = dragOffset

    // Only trigger swipe actions if it was a horizontal swipe
    if (isHorizontalSwipe && Math.abs(x) > SWIPE_THRESHOLD) {
      if (x > 0) {
        onSwipeRight()
      } else {
        onSwipeLeft()
      }
    }

    setIsDragging(false)
    setDragOffset({ x: 0, y: 0 })
    setIsHorizontalSwipe(false)
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY)
  }


  // Touch events - Enhanced touch handling for better mobile support
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    // Only prevent default if this is a horizontal swipe to allow vertical scrolling
    if (isHorizontalSwipe) {
      e.preventDefault()
    }
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isHorizontalSwipe) {
      e.preventDefault()
    }
    handleEnd()
  }

  // Global mouse move and up events
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX, e.clientY)
      }
    }

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleEnd()
      }
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleGlobalMouseMove)
      document.addEventListener("mouseup", handleGlobalMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove)
      document.removeEventListener("mouseup", handleGlobalMouseUp)
    }
  }, [isDragging, dragOffset, startPos])

  // Disable scrolling during horizontal swipes
  useEffect(() => {
    if (isHorizontalSwipe && isDragging) {
      // Prevent body scroll during horizontal swipe
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isHorizontalSwipe, isDragging])

  const rotation = (dragOffset.x / (typeof window !== 'undefined' ? window.innerWidth : 1000)) * MAX_ROTATION
  const opacity = Math.max(0.7, 1 - Math.abs(dragOffset.x) / 300)

  const getSwipeIndicatorColor = () => {
    if (Math.abs(dragOffset.x) < 50) return "transparent"
    return dragOffset.x > 0 ? "rgba(34, 197, 94, 0.2)" : "rgba(251, 146, 60, 0.2)" // Orange for review
  }

  const getSwipeIndicatorBorder = () => {
    if (Math.abs(dragOffset.x) < 50) return "none"
    return dragOffset.x > 0 ? "2px solid rgb(34, 197, 94)" : "2px solid rgb(251, 146, 60)" // Orange for review
  }

  return (
    <div
      ref={cardRef}
      className={`relative select-none cursor-grab active:cursor-grabbing transition-transform touch-none ${className}`}
      style={{
        transform: `translateX(${dragOffset.x}px) rotate(${rotation}deg)`,
        opacity: opacity,
        backgroundColor: getSwipeIndicatorColor(),
        border: getSwipeIndicatorBorder(),
        borderRadius: "0.5rem",
        transition: isDragging
          ? "none"
          : "transform 0.3s ease-out, opacity 0.3s ease-out, background-color 0.2s ease-out, border 0.2s ease-out",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}

      {Math.abs(dragOffset.x) > 50 && (
        <>
          <div
            className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-semibold transition-opacity ${
              dragOffset.x > 0 ? "bg-green-500 text-white opacity-100" : "opacity-0"
            }`}
          >
            APPROVE
          </div>
          <div
            className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-semibold transition-opacity ${
              dragOffset.x < 0 ? "bg-orange-500 text-white opacity-100" : "opacity-0"
            }`}
          >
            TO REVIEW
          </div>
        </>
      )}
    </div>
  )
}
