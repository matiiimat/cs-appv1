"use client"

import { FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Invoice {
  id: string
  date: string
  amount: number
  status: string
  invoice_pdf: string | null
  description: string | null
}

interface InvoiceListProps {
  invoices: Invoice[]
  isLoading: boolean
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return (
        <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">
          Paid
        </span>
      )
    case 'open':
      return (
        <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
          Open
        </span>
      )
    case 'void':
      return (
        <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
          Void
        </span>
      )
    default:
      return (
        <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
          {status}
        </span>
      )
  }
}

export function InvoiceList({ invoices, isLoading }: InvoiceListProps) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-border/30 last:border-b-0 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded" />
              <div>
                <div className="h-4 w-24 bg-muted rounded mb-1" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            </div>
            <div className="h-4 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No invoices yet</p>
        <p className="text-xs mt-1">Your invoices will appear here after your first payment</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="flex items-center justify-between py-3 border-b border-border/30 last:border-b-0 hover:bg-muted/30 transition-colors -mx-2 px-2 rounded"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted/50 rounded flex items-center justify-center">
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatAmount(invoice.amount)}</span>
                {getStatusBadge(invoice.status)}
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(invoice.date)}</p>
            </div>
          </div>
          {invoice.invoice_pdf && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-muted-foreground hover:text-foreground"
            >
              <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4 mr-1" />
                PDF
              </a>
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
