"use client"

import { Skeleton, SkeletonCircle } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar Skeleton */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-5 w-16" />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-md" />
              ))}
            </div>

            {/* Search Button */}
            <Skeleton className="hidden md:block h-8 w-24 rounded-md" />

            {/* Mobile Navigation */}
            <div className="flex md:hidden items-center gap-1">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-9 w-9 rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Queue View Skeleton */}
      <main className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-8 w-24" />
        </div>

        {/* Pipeline Skeleton - Two stages */}
        <div className="flex items-center gap-3 mb-8">
          {/* Stage 1 */}
          <div className="flex-1 p-4 rounded-lg border border-border/30">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>

          {/* Arrow */}
          <Skeleton className="h-5 w-5 shrink-0" />

          {/* Stage 2 */}
          <div className="flex-1 p-4 rounded-lg border border-border/30">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mb-8">
          <Skeleton className="h-11 w-48 rounded-md" />
        </div>

        {/* Stats Grid - Seamless */}
        <div className="mb-8">
          <Skeleton className="h-4 w-20 mb-4" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="py-4 border-b border-border/30">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-7 w-12 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>

        {/* Category Chart + Usage Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Skeleton className="h-4 w-32 mb-4" />
            <div className="flex items-center justify-center gap-8 py-4">
              {/* Pie chart placeholder */}
              <SkeletonCircle size="h-32 w-32" />
              {/* Legend */}
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Usage Widget Skeleton */}
          <div>
            <Skeleton className="h-3 w-24 mb-3" />
            <div className="flex items-baseline gap-1 mb-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-1.5 w-full rounded mb-2" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
