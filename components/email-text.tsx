"use client"

import React, { useMemo, useState } from "react"

interface Segment {
  type: 'main' | 'quote'
  lines: string[]
}

function splitEmailSegments(text: string): Segment[] {
  if (!text) return []
  const lines = text.split(/\r?\n/)
  const segments: Segment[] = []

  const replyHeaderRe = /^On .+ wrote:$/i
  const originalMarkerRe = /^[-\s]*Original Message[-\s]*$/i

  let inQuoteTail = false
  let current: Segment | null = null

  const pushLine = (type: Segment['type'], line: string) => {
    if (!current || current.type !== type) {
      current = { type, lines: [] }
      segments.push(current)
    }
    current.lines.push(line)
  }

  for (const raw of lines) {
    const line = raw ?? ''
    const trimmed = line.trim()

    // If we've hit a reply header or original marker, treat the rest as quoted tail
    if (!inQuoteTail && (replyHeaderRe.test(trimmed) || originalMarkerRe.test(trimmed))) {
      inQuoteTail = true
    }

    const isAngleQuote = trimmed.startsWith('>')
    const isQuoted = inQuoteTail || isAngleQuote

    pushLine(isQuoted ? 'quote' : 'main', line)
  }

  return segments
}

function QuotedBlock({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="my-2">
      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-foreground underline"
        aria-expanded={expanded}
        onClick={() => setExpanded(v => !v)}
      >
        {expanded ? 'Hide quoted text' : 'Show quoted text'}
      </button>
      {expanded && (
        <div className="mt-2 border-l-2 border-muted-foreground/40 pl-3 text-xs text-muted-foreground bg-muted/20 rounded-sm whitespace-pre-wrap break-words">
          {children}
        </div>
      )}
    </div>
  )}

export function EmailText({ text }: { text: string }) {
  const segments = useMemo(() => splitEmailSegments(text), [text])

  if (!segments.length) return null

  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
      {segments.map((seg, idx) => (
        seg.type === 'main' ? (
          <div key={idx}>
            {seg.lines.join('\n')}
          </div>
        ) : (
          <QuotedBlock key={idx}>
            {seg.lines.join('\n')}
          </QuotedBlock>
        )
      ))}
    </div>
  )
}

