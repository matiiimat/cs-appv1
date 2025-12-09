import { cn } from "@/lib/utils"

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

function SkeletonText({
  className,
  width = "w-full",
  ...props
}: SkeletonProps & { width?: string }) {
  return (
    <Skeleton
      className={cn("h-4", width, className)}
      {...props}
    />
  )
}

function SkeletonCircle({
  className,
  size = "h-10 w-10",
  ...props
}: SkeletonProps & { size?: string }) {
  return (
    <Skeleton
      className={cn("rounded-full", size, className)}
      {...props}
    />
  )
}

function SkeletonCard({
  className,
  children,
  ...props
}: SkeletonProps & { children?: React.ReactNode }) {
  return (
    <div
      className={cn("bg-card border border-border rounded-lg p-4", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Skeleton, SkeletonText, SkeletonCircle, SkeletonCard }
