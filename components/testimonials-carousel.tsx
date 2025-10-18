"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

type Testimonial = {
  name: string
  role: string
  company: string
  feedback: string
}

const ITEMS: Testimonial[] = [
  { name: "Alice B.", role: "Ops Lead", company: "Acme", feedback: "Aidly cut our first response times in half. The triage workflow is addictive." },
  { name: "Noah C.", role: "Support Manager", company: "Brightlabs", feedback: "We finally have a clean queue every day. Simple, fast, reliable." },
  { name: "Maya D.", role: "Founder", company: "Kite", feedback: "Zero setup surprise. We were replying to customers in minutes." },
  { name: "Leo F.", role: "Customer Success", company: "Northbase", feedback: "The AI suggestions are solid—saves me context switching all day." },
  { name: "Iris G.", role: "Product", company: "Flowbit", feedback: "Great balance of automation and control. Our agents love it." },
  { name: "Victor H.", role: "Head of Support", company: "Nimbus", feedback: "Queue discipline improved immediately. Metrics reflect the difference." },
  { name: "Sofia J.", role: "Operations", company: "Palette", feedback: "Clean UI and fast actions. Exactly what we needed for scale." },
  { name: "Ethan K.", role: "CX Lead", company: "Orbit", feedback: "Approvals + review lanes keep quality high without slowing us down." },
  { name: "Zara L.", role: "Support Analyst", company: "Zephyr", feedback: "Setup was painless. The category insights are surprisingly useful." },
  { name: "Adam M.", role: "CEO", company: "Quokka", feedback: "ROI was immediate. Customers are getting answers faster than ever." },
]

export function TestimonialsCarousel() {
  const [index, setIndex] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const total = ITEMS.length

  const current = useMemo(() => ITEMS[index], [index])

  const next = () => setIndex((i) => (i + 1) % total)
  const prev = () => setIndex((i) => (i - 1 + total) % total)

  // Auto-advance every 5s; pause on hover
  useEffect(() => {
    intervalRef.current && clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => next(), 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [index])

  const pause = () => intervalRef.current && clearInterval(intervalRef.current)
  const resume = () => {
    intervalRef.current && clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => next(), 5000)
  }

  return (
    <div className="w-full">
      <div
        className="relative mx-auto max-w-3xl rounded-lg border bg-card p-6 shadow-sm"
        onMouseEnter={pause}
        onMouseLeave={resume}
      >
        <div className="mb-3 text-sm text-muted-foreground">{current.role}, {current.company}</div>
        <div className="text-lg font-medium">{current.name}</div>
        <p className="mt-3 text-base leading-relaxed text-foreground">“{current.feedback}”</p>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-between">
          <button
            aria-label="Previous"
            onClick={prev}
            className="p-2 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition"
            style={{ background: 'transparent' }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1">
            {ITEMS.map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${i === index ? 'bg-foreground' : 'bg-muted'}`}
                aria-hidden
              />
            ))}
          </div>
          <button
            aria-label="Next"
            onClick={next}
            className="p-2 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition"
            style={{ background: 'transparent' }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
