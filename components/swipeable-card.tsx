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
  const cardRef = useRef<HTMLDivElement>(null)

  const SWIPE_THRESHOLD = 100
  const MAX_ROTATION = 15

  const handleStart = (clientX: number, clientY: number) => {
    if (disabled) return
    setIsDragging(true)
    setStartPos({ x: clientX, y: clientY })
  }

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || disabled) return

    const deltaX = clientX - startPos.x
    const deltaY = clientY - startPos.y
    setDragOffset({ x: deltaX, y: deltaY })
  }

  const handleEnd = () => {
    if (!isDragging || disabled) return

    const { x } = dragOffset

    if (Math.abs(x) > SWIPE_THRESHOLD) {
      if (x > 0) {
        onSwipeRight()
      } else {
        onSwipeLeft()
      }
    }

    setIsDragging(false)
    setDragOffset({ x: 0, y: 0 })
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY)
  }


  // Touch events - Enhanced touch handling for better mobile support
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault() // Prevent scrolling while swiping
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault() // Prevent scrolling while swiping
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
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

  const rotation = (dragOffset.x / window.innerWidth) * MAX_ROTATION
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
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
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
