'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { StarRating, getRatingLabel } from '@/components/ui/star-rating';
import { CSAT_FEEDBACK_MAX_LENGTH } from '@/lib/csat-tokens';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

type Status = 'loading' | 'valid' | 'expired' | 'submitted' | 'error';

interface StatusMessageProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  children: React.ReactNode;
}

function StatusMessage({ icon: Icon, iconBg, iconColor, title, children }: StatusMessageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className={`h-16 w-16 rounded-full ${iconBg} flex items-center justify-center mx-auto mb-4`}>
          <Icon className={`h-8 w-8 ${iconColor}`} />
        </div>
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export default function RatePage() {
  const params = useParams();
  const token = params?.token as string;

  const [status, setStatus] = useState<Status>('loading');
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    fetch(`/api/csat/status?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setStatus('valid');
        } else if (data.reason === 'expired') {
          setStatus('expired');
        } else if (data.reason === 'already_submitted') {
          setStatus('submitted');
          setExistingRating(data.rating);
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, [token]);

  const handleSubmit = async () => {
    if (rating === 0 || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/csat/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          rating,
          feedback: feedback.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        if (data.reason === 'expired' || res.status === 410) {
          setStatus('expired');
        } else if (data.reason === 'duplicate' || res.status === 409) {
          setStatus('submitted');
        } else {
          setErrorMessage('Failed to submit rating. Please try again.');
        }
      }
    } catch {
      setErrorMessage('Connection error. Please check your internet and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Expired state
  if (status === 'expired') {
    return (
      <StatusMessage
        icon={Clock}
        iconBg="bg-amber-500/10"
        iconColor="text-amber-500"
        title="Survey Expired"
      >
        <p className="text-muted-foreground">
          This rating link has expired. Survey links are valid for 7 days after your support request is resolved.
        </p>
      </StatusMessage>
    );
  }

  // Already submitted state
  if (status === 'submitted') {
    return (
      <StatusMessage
        icon={CheckCircle2}
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-500"
        title="Already Submitted"
      >
        <p className="text-muted-foreground mb-4">
          You&apos;ve already submitted your feedback for this request.
        </p>
        {existingRating && <StarRating rating={existingRating} size="md" />}
      </StatusMessage>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <StatusMessage
        icon={XCircle}
        iconBg="bg-destructive/10"
        iconColor="text-destructive"
        title="Invalid Link"
      >
        <p className="text-muted-foreground">
          This rating link is not valid. Please check that you&apos;re using the correct link from your email.
        </p>
      </StatusMessage>
    );
  }

  // Success state
  if (success) {
    return (
      <StatusMessage
        icon={CheckCircle2}
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-500"
        title="Thank You!"
      >
        <p className="text-muted-foreground mb-4">
          Your feedback has been submitted. We appreciate you taking the time to rate your experience.
        </p>
        <StarRating rating={rating} size="md" />
      </StatusMessage>
    );
  }

  // Rating form (valid state)
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="surface-elevated rounded-xl p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-center mb-2">How was your experience?</h1>
        <p className="text-muted-foreground text-center mb-8">
          We&apos;d love to hear your feedback about the support you received.
        </p>

        {/* Star Rating */}
        <div className="mb-4">
          <StarRating
            rating={rating}
            hoveredRating={hoveredRating}
            onRatingChange={setRating}
            onHoverChange={setHoveredRating}
            interactive
            size="lg"
          />
        </div>

        {/* Rating label - always reserve space to prevent layout shift */}
        <p className="text-center text-sm text-muted-foreground mb-6 h-5">
          {(hoveredRating || rating) > 0 ? getRatingLabel(hoveredRating || rating) : '\u00A0'}
        </p>

        {/* Optional Feedback */}
        <div className="mb-6">
          <label htmlFor="feedback" className="block text-sm font-medium mb-2">
            Any additional feedback? <span className="text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            maxLength={CSAT_FEEDBACK_MAX_LENGTH}
            rows={4}
            placeholder="Tell us more about your experience..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {feedback.length}/{CSAT_FEEDBACK_MAX_LENGTH}
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{errorMessage}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className="w-full"
          size="lg"
        >
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </Button>

        {rating === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Please select a rating to continue
          </p>
        )}
      </div>
    </div>
  );
}
