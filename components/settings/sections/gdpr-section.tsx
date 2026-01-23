"use client"

import { useState, useEffect } from "react"
import { SectionHeader } from "../section-header"
import { SettingCard } from "../setting-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Trash2, AlertTriangle, Loader2, Shield, CheckCircle } from "lucide-react"

interface ExportStats {
  messageCount: number
  userCount: number
  createdAt: string
}

interface DeletionStatus {
  canDelete: boolean
  reason: string | null
  stats: ExportStats
}

export function GDPRSection() {
  // Export state
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [exportStats, setExportStats] = useState<ExportStats | null>(null)

  // Deletion state
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deletionError, setDeletionError] = useState<string | null>(null)
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null)
  const [showDeleteForm, setShowDeleteForm] = useState(false)

  // Load initial stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const [exportResp, deleteResp] = await Promise.all([
          fetch("/api/gdpr/export"),
          fetch("/api/gdpr/delete-account"),
        ])

        if (exportResp.ok) {
          const data = await exportResp.json()
          setExportStats(data.stats)
        }

        if (deleteResp.ok) {
          const data = await deleteResp.json()
          setDeletionStatus(data)
        }
      } catch {
        // Silently fail - stats are optional
      }
    }

    loadStats()
  }, [])

  const handleExportData = async () => {
    setIsExporting(true)
    setExportError(null)
    setExportSuccess(false)

    try {
      const response = await fetch("/api/gdpr/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Export failed")
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `data-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 5000)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Failed to export data")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      setDeletionError('Please type "DELETE" to confirm')
      return
    }

    const confirmed = window.confirm(
      "Are you absolutely sure you want to delete your account?\n\n" +
        "This will permanently delete:\n" +
        "- All messages and customer data\n" +
        "- All users in your organization\n" +
        "- All settings and customizations\n\n" +
        "This action cannot be undone."
    )

    if (!confirmed) return

    setIsDeletingAccount(true)
    setDeletionError(null)

    try {
      const response = await fetch("/api/gdpr/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmDelete: true }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Deletion failed")
      }

      // Redirect to homepage after successful deletion
      window.location.href = "/"
    } catch (error) {
      setDeletionError(error instanceof Error ? error.message : "Failed to delete account")
      setIsDeletingAccount(false)
    }
  }

  return (
    <div className="animate-in fade-in duration-200">
      <SectionHeader
        title="Privacy & Data"
        description="GDPR compliance: Export your data or delete your account"
      />

      <div className="space-y-6">
        {/* Data Export Card */}
        <SettingCard bordered>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Export Your Data</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Download all your organization data including messages, settings, and activity logs
                in JSON format. All personal information will be decrypted for your export.
              </p>

              {exportStats && (
                <div className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 inline-flex items-center gap-4">
                  <span>{exportStats.messageCount.toLocaleString()} messages</span>
                  <span className="text-border">|</span>
                  <span>{exportStats.userCount} users</span>
                  <span className="text-border">|</span>
                  <span>Since {new Date(exportStats.createdAt).toLocaleDateString()}</span>
                </div>
              )}

              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleExportData}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </>
                  )}
                </Button>

                {exportSuccess && (
                  <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" />
                    Export downloaded
                  </span>
                )}
              </div>

              {exportError && (
                <div className="mt-3 text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {exportError}
                </div>
              )}
            </div>
          </div>
        </SettingCard>

        {/* Account Deletion Card */}
        <SettingCard bordered>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Delete Account</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Permanently delete your organization and all associated data. This action cannot be
                undone. Only administrators can delete the organization.
              </p>

              {deletionStatus && !deletionStatus.canDelete && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {deletionStatus.reason}
                  </p>
                </div>
              )}

              {(!deletionStatus || deletionStatus.canDelete) && !showDeleteForm && (
                <Button
                  variant="outline"
                  className="mt-4 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => setShowDeleteForm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account...
                </Button>
              )}

              {showDeleteForm && (
                <div className="mt-4 space-y-4">
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-foreground">
                          Warning: This action is irreversible
                        </h4>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                          <li>All messages and customer data will be deleted</li>
                          <li>All users in your organization will lose access</li>
                          <li>Settings and customizations will be lost</li>
                          <li>This cannot be undone</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">
                      Type{" "}
                      <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                        DELETE
                      </code>{" "}
                      to confirm
                    </label>
                    <Input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="max-w-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount || deleteConfirmText !== "DELETE"}
                    >
                      {isDeletingAccount ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Permanently Delete Account
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowDeleteForm(false)
                        setDeleteConfirmText("")
                        setDeletionError(null)
                      }}
                      disabled={isDeletingAccount}
                    >
                      Cancel
                    </Button>
                  </div>

                  {deletionError && (
                    <div className="text-sm text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {deletionError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </SettingCard>

        {/* GDPR Info Card */}
        <SettingCard bordered className="bg-muted/20">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Your Privacy Rights</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Under GDPR, you have the right to access, export, and delete your data. We encrypt
                all customer data at rest and anonymize personal information before sending to AI
                providers.
              </p>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <a href="/privacy" className="hover:text-primary underline">
                  Privacy Policy
                </a>
                <a href="/dpa" className="hover:text-primary underline">
                  Data Processing Agreement
                </a>
                <a href="mailto:support@aidlyhq.com" className="hover:text-primary underline">
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </SettingCard>
      </div>
    </div>
  )
}
