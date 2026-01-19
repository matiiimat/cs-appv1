'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  hoveredRating?: number;
  onRatingChange?: (rating: number) => void;
  onHoverChange?: (rating: number) => void;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-12 w-12',
};

const gapClasses = {
  sm: 'gap-0.5',
  md: 'gap-1',
  lg: 'gap-3',
};

export function StarRating({
  rating,
  hoveredRating = 0,
  onRatingChange,
  onHoverChange,
  interactive = false,
  size = 'md',
  className,
}: StarRatingProps) {
  const displayRating = hoveredRating || rating;

  return (
    <div className={cn('flex justify-center', gapClasses[size], className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayRating;
        const starClass = cn(
          sizeClasses[size],
          'transition-colors',
          isFilled
            ? 'fill-amber-400 text-amber-400'
            : interactive
            ? 'text-muted-foreground/40 hover:text-muted-foreground/60'
            : 'text-muted-foreground/30'
        );

        if (interactive) {
          return (
            <button
              key={star}
              type="button"
              onClick={() => onRatingChange?.(star)}
              onMouseEnter={() => onHoverChange?.(star)}
              onMouseLeave={() => onHoverChange?.(0)}
              className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              <Star className={starClass} />
            </button>
          );
        }

        return <Star key={star} className={starClass} />;
      })}
    </div>
  );
}

const ratingLabels: Record<number, string> = {
  1: 'Very unsatisfied',
  2: 'Unsatisfied',
  3: 'Neutral',
  4: 'Satisfied',
  5: 'Very satisfied',
};

export function getRatingLabel(rating: number): string {
  return ratingLabels[rating] || '';
}
