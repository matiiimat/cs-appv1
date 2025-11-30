"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Sparkles } from "lucide-react"

interface Message {
  id: string
  ticket_id: string
  customer_name: string | null
  customer_email: string | null
  subject: string | null
  message: string | null
  ai_suggested_response: string | null
  category: string | null
  status: string
}

interface AddToKnowledgeBaseModalProps {
  isOpen: boolean
  onClose: () => void
  message: Message
}

interface Synthesis {
  case_summary: string
  resolution: string
  category?: string
}

export function AddToKnowledgeBaseModal({ isOpen, onClose, message }: AddToKnowledgeBaseModalProps) {
  const [step, setStep] = useState<'initial' | 'editing'>('initial')
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleGenerateSummary = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/knowledge-base/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: message.customer_name,
          customer_email: message.customer_email,
          subject: message.subject,
          message: message.message,
          ai_suggested_response: message.ai_suggested_response,
          category: message.category,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }

      const data = await response.json()
      setSynthesis(data.synthesis)
      setStep('editing')
    } catch {
      alert("Failed to generate knowledge base summary. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!synthesis) return

    setIsSaving(true)
    try {
      // Save directly to localStorage (client-side only)
      const { KnowledgeBaseStorage } = await import('@/lib/knowledge-base')

      const newEntry = KnowledgeBaseStorage.create({
        case_summary: synthesis.case_summary,
        resolution: synthesis.resolution,
        category: synthesis.category,
      })

      console.log('Saved KB entry:', newEntry)
      alert("Knowledge base entry has been saved successfully.")
      handleClose()
    } catch (error) {
      console.error('Failed to save KB entry:', error)
      alert("Failed to save knowledge base entry. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setStep('initial')
    setSynthesis(null)
    onClose()
  }

  const updateSynthesis = (field: keyof Synthesis, value: string) => {
    if (!synthesis) return
    setSynthesis({ ...synthesis, [field]: value })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to Knowledge Base</DialogTitle>
          <DialogDescription>
            {step === 'initial'
              ? "Generate a summary of this case to add to your knowledge base for improving future AI responses."
              : "Review and edit the generated summary before adding it to your knowledge base."
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'initial' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Case Details</h4>
                    <p className="font-medium">{message.ticket_id}</p>
                    {message.subject && <p className="text-sm">{message.subject}</p>}
                    {message.category && <p className="text-xs text-muted-foreground">{message.category}</p>}
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Original Message</h4>
                    <div className="bg-muted/50 p-3 rounded-md text-sm max-h-32 overflow-y-auto">
                      {message.message || 'No message content'}
                    </div>
                  </div>

                  {message.ai_suggested_response && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">
                        {message.status === 'sent' ? 'Sent Response' : 'AI Response'}
                      </h4>
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md text-sm max-h-32 overflow-y-auto">
                        {message.ai_suggested_response}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button
                onClick={handleGenerateSummary}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Summary...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Summary
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'editing' && synthesis && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="case_summary">Case Summary</Label>
                <Textarea
                  id="case_summary"
                  value={synthesis?.case_summary || ''}
                  onChange={(e) => updateSynthesis('case_summary', e.target.value)}
                  placeholder="Concise summary of the customer issue..."
                  rows={4}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Describe the customer&apos;s issue without any personally identifiable information.
                </p>
              </div>

              <div>
                <Label htmlFor="resolution">Resolution</Label>
                <Textarea
                  id="resolution"
                  value={synthesis?.resolution || ''}
                  onChange={(e) => updateSynthesis('resolution', e.target.value)}
                  placeholder="How the issue was resolved..."
                  rows={4}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Describe the solution that was provided or how the issue was resolved.
                </p>
              </div>

              {synthesis?.category && (
                <div>
                  <Label htmlFor="category">Category</Label>
                  <input
                    id="category"
                    type="text"
                    value={synthesis?.category || ''}
                    onChange={(e) => updateSynthesis('category', e.target.value)}
                    className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Issue category"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('initial')}>
                Back
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !synthesis?.case_summary?.trim() || !synthesis?.resolution?.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save to Knowledge Base'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'initial' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}