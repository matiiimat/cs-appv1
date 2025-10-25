import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEmailText(text: string): string {
  if (!text) return text
  
  // Add line breaks after common email greetings and before signatures
  return text
    // Add line break after greetings
    .replace(/(Dear [^,]+,)\s*/g, '$1\n\n')
    .replace(/(Hello [^,]+,)\s*/g, '$1\n\n') 
    .replace(/(Hi [^,]+,)\s*/g, '$1\n\n')
    .replace(/(Thank you for [^.!]+[.!])\s*/g, '$1\n\n')
    .replace(/(Thanks for [^.!]+[.!])\s*/g, '$1\n\n')
    // Add line break before signatures (common sign-offs)
    .replace(/\s*(Best regards,|Sincerely,|Kind regards,|Thank you,|Thanks,)/g, '\n\n$1')
    // Handle signature patterns that might not have commas
    .replace(/\s*(Best regards|Sincerely|Kind regards)(\s+[^\n])/g, '\n\n$1,$2')
}

export function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const messageDate = new Date(timestamp)
  const diffInMs = now.getTime() - messageDate.getTime()
  
  const seconds = Math.floor(diffInMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)
  
  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'just now'
}

export type MessageUrgency = 'green' | 'yellow' | 'red'

export function getMessageUrgency(
  timestamp: string,
  thresholds: { greenHours: number; yellowHours: number; redHours: number }
): MessageUrgency {
  const now = new Date()
  const messageDate = new Date(timestamp)
  const diffInMs = now.getTime() - messageDate.getTime()
  const hoursOld = diffInMs / (1000 * 60 * 60)
  
  // Debug logging removed
  
  if (hoursOld <= thresholds.greenHours) return 'green'
  if (hoursOld <= thresholds.yellowHours) return 'yellow'
  return 'red'
}

export function getUrgencyBgClass(urgency: MessageUrgency): string {
  switch (urgency) {
    case 'green':
      return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
    case 'yellow':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
    case 'red':
      return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
  }
}

export function formatFriendlyDate(timestamp: string): string {
  const date = new Date(timestamp)
  
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  
  const month = monthNames[date.getMonth()]
  const day = date.getDate()
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  
  return `${month} ${day}, ${time}`
}

// Strip quoted email content for compact tooltip display
export function stripQuotedForTooltip(text: string, limit = 200): string {
  if (!text) return ''
  const lines = text.split(/\r?\n/)
  const kept: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (
      line.startsWith('>') ||
      /^On .+ wrote:$/i.test(line) ||
      /^-----Original Message-----/i.test(line)
    ) {
      break
    }
    kept.push(raw)
  }
  // Fallback: if nothing kept (message starts with quote), take the first non-quoted non-empty line
  if (kept.length === 0) {
    const first = lines.find(l => l.trim() && !l.trim().startsWith('>')) || ''
    kept.push(first)
  }
  const singleLine = kept.join(' ').replace(/\s+/g, ' ').trim()
  if (limit > 0 && singleLine.length > limit) {
    return singleLine.slice(0, Math.max(0, limit - 1)) + '…'
  }
  return singleLine
}
