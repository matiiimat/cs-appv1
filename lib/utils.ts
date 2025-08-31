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
