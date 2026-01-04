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

        {/* AI Processing Queue Card */}
        <div className="surface-elevated rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>

          {/* Queue Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <Skeleton className="h-8 w-12 mx-auto mb-2" />
              <Skeleton className="h-4 w-28 mx-auto" />
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <Skeleton className="h-8 w-12 mx-auto mb-2" />
              <Skeleton className="h-4 w-28 mx-auto" />
            </div>
          </div>

          {/* Process Controls */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex-1">
                <Skeleton className="h-4 w-20 mb-2" />
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-14 rounded-md" />
                  ))}
                </div>
              </div>
              <Skeleton className="h-11 w-48 rounded-md" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="surface p-4 rounded-lg">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Category Chart + Usage Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="surface p-6 rounded-lg">
            <Skeleton className="h-4 w-32 mb-4" />
            <div className="flex items-center justify-center gap-8">
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
          <div className="surface p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full rounded mb-2" />
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
