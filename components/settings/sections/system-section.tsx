"use client"

import { useState, useEffect } from "react"
import { SectionHeader } from "../section-header"
import { SettingCard } from "../setting-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Copy, Check, LogOut, Mail } from "lucide-react"

export function SystemSection() {
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [copied, setCopied] = useState(false)
  const [mailbox, setMailbox] = useState<{ forwardToAddress: string } | null>(null)
  const [mailboxError, setMailboxError] = useState<string | null>(null)

  useEffect(() => {
    const loadMailbox = async () => {
      try {
        const resp = await fetch("/api/organization/mailbox")
        if (resp.ok) {
          const data = await resp.json()
          if (data?.forwardToAddress) {
            setMailbox({ forwardToAddress: data.forwardToAddress })
            setMailboxError(null)
          } else {
            setMailbox(null)
            setMailboxError(data?.error || "Mailbox configuration unavailable")
          }
        }
      } catch {
        setMailbox(null)
        setMailboxError("Failed to load mailbox configuration")
      }
    }

    loadMailbox()
  }, [])

  const handleCopyMailbox = async () => {
    if (!mailbox) return
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(mailbox.forwardToAddress)
      } else {
        const ta = document.createElement("textarea")
        ta.value = mailbox.forwardToAddress
        ta.style.position = "fixed"
        ta.style.opacity = "0"
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Copy failed:", err)
    }
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await fetch("/api/auth/sign-out", { method: "POST" })
    } catch {
      // ignore
    } finally {
      window.location.href = "https://aidly.me"
    }
  }

  return (
    <div className="animate-in fade-in duration-200">
      <SectionHeader
        title="Account"
        description="Email configuration and account management"
      />

      <div className="space-y-6">
        {/* Email Forwarding */}
        <SettingCard bordered>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">Email Forwarding</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Forward your support email to this address to receive messages in SupportAI.
              </p>

              {mailbox ? (
                <div className="mt-4 flex items-center gap-2">
                  <Input
                    readOnly
                    value={mailbox.forwardToAddress}
                    onFocus={(e) => e.currentTarget.select()}
                    className="font-mono text-sm flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyMailbox}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <div className="mt-4 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  {mailboxError ?? "Mailbox alias not available. Ensure INBOUND_DOMAIN is configured."}
                </div>
              )}
            </div>
          </div>
        </SettingCard>

        {/* Sign Out */}
        <SettingCard bordered>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <LogOut className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Sign Out</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Sign out of your account on this device.
              </p>
              <Button
                variant="outline"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="mt-4"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isSigningOut ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          </div>
        </SettingCard>
      </div>
    </div>
  )
}
