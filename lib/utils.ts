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
