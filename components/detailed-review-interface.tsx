"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMessageManager } from "@/lib/message-manager"
import { useSettings } from "@/lib/settings-context"
import { Clock, User, Send, Bot, MessageSquare, Zap, Smartphone, Keyboard } from "lucide-react"

interface ChatMessage {
  id: string
  content: string
  sender: "agent" | "ai"
  timestamp: Date
}

export function DetailedReviewInterface() {
  const { messages, updateMessage } = useMessageManager()
  const { settings } = useSettings()
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [aiChatInput, setAiChatInput] = useState("")
  const [lastAiResponse, setLastAiResponse] = useState("")

  const reviewMessages = messages.filter((msg) => msg.status === "review")
  const selectedMessage = reviewMessages.find((msg) => msg.id === selectedMessageId)

  useEffect(() => {
    if (reviewMessages.length > 0 && !selectedMessageId) {
      setSelectedMessageId(reviewMessages[0].id)
    }
  }, [reviewMessages, selectedMessageId])

  useEffect(() => {
    if (selectedMessage?.aiSuggestedResponse) {
      setReplyText(selectedMessage.aiSuggestedResponse)
      setLastAiResponse(selectedMessage.aiSuggestedResponse)
    }
  }, [selectedMessage])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedMessage) return

      // Only trigger if not typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key.toLowerCase()) {
        case "a":
          e.preventDefault()
          handleApprove()
          break
        case "r":
          e.preventDefault()
          handleSendToReview()
          break
        case "u":
          e.preventDefault()
          handleUndo()
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [selectedMessage])

  const handleApprove = () => {
    if (selectedMessage) {
      updateMessage(selectedMessage.id, { status: "approved" })

      const remainingMessages = reviewMessages.filter((msg) => msg.id !== selectedMessage.id)

      if (remainingMessages.length > 0) {
        // Find the next message after the current one
        const currentIndex = reviewMessages.findIndex((msg) => msg.id === selectedMessageId)
        const nextMessage =
          remainingMessages.find((msg) => {
            const originalIndex = reviewMessages.findIndex((original) => original.id === msg.id)
            return originalIndex > currentIndex
          }) || remainingMessages[0]

        setSelectedMessageId(nextMessage.id)
      } else {
        setSelectedMessageId(null)
      }

      setReplyText("")
      setChatMessages([])
    }
  }

  const handleSendToReview = () => {
    if (selectedMessage) {
      updateMessage(selectedMessage.id, { status: "pending" })

      const remainingMessages = reviewMessages.filter((msg) => msg.id !== selectedMessage.id)

      if (remainingMessages.length > 0) {
        const currentIndex = reviewMessages.findIndex((msg) => msg.id === selectedMessageId)
        const nextMessage =
          remainingMessages.find((msg) => {
            const originalIndex = reviewMessages.findIndex((original) => original.id === msg.id)
            return originalIndex > currentIndex
          }) || remainingMessages[0]

        setSelectedMessageId(nextMessage.id)
      } else {
        setSelectedMessageId(null)
      }

      setReplyText("")
      setChatMessages([])
    }
  }

  const handleUndo = () => {
    // Simple undo - could be enhanced to track history
    setReplyText(selectedMessage?.aiSuggestedResponse || "")
    setChatMessages([])
  }

  const handleAiChat = async () => {
    if (!aiChatInput.trim() || !selectedMessage) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: aiChatInput,
      sender: "agent",
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setAiChatInput("")

    setTimeout(() => {
      const aiSuggestedResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `Based on the customer's message about "${selectedMessage.message.substring(0, 50)}...", I suggest focusing on ${selectedMessage.category?.toLowerCase()} best practices. The customer seems ${selectedMessage.priority === "high" ? "urgent" : "patient"}, so adjust your tone accordingly.`,
        sender: "ai",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, aiSuggestedResponse])
      setLastAiResponse(aiSuggestedResponse.content)
    }, 1000)
  }

  const handleMacroClick = async (macroAction: string) => {
    if (!selectedMessage) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `Execute macro: ${macroAction}`,
      sender: "agent",
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])

    setTimeout(async () => {
      let responseContent = ""
      let updatedReplyText = replyText

      if (macroAction === "translate_to_spanish") {
        responseContent = "I've translated the AI response to Spanish and added it to your reply field."
        const spanishTranslation = await translateToSpanish(lastAiResponse || selectedMessage.aiSuggestedResponse || "")
        updatedReplyText = spanishTranslation
      } else if (macroAction === "use_last_ai_response") {
        responseContent = "I've added the last AI response to your reply field."
        updatedReplyText = lastAiResponse || selectedMessage.aiSuggestedResponse || ""
      } else if (macroAction === "custom_action") {
        const customMacro = settings.macros.find((m) => m.id === "custom-macro")
        responseContent = `I've executed your custom macro: "${customMacro?.action || "No custom action defined"}"`
        if (customMacro?.action) {
          updatedReplyText = replyText ? `${replyText}\n\n${customMacro.action}` : customMacro.action
        }
      } else {
        responseContent = `I've processed your macro request: "${macroAction}"`
        updatedReplyText = replyText ? `${replyText}\n\n${macroAction}` : macroAction
      }

      const aiSuggestedResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        sender: "ai",
        timestamp: new Date(),
      }

      setChatMessages((prev) => [...prev, aiSuggestedResponse])
      setReplyText(updatedReplyText)
    }, 1000)
  }

  const translateToSpanish = async (text: string): Promise<string> => {
    const commonTranslations: { [key: string]: string } = {
      Hello: "Hola",
      "Thank you": "Gracias",
      Please: "Por favor",
      Sorry: "Lo siento",
      Help: "Ayuda",
      Problem: "Problema",
      Solution: "Solución",
      Customer: "Cliente",
      Support: "Soporte",
    }

    let translatedText = text
    Object.entries(commonTranslations).forEach(([english, spanish]) => {
      translatedText = translatedText.replace(new RegExp(english, "gi"), spanish)
    })

    return `[Traducido al español] ${translatedText}`
  }

  if (reviewMessages.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="relative">
            <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Queue Empty!</h3>
          <p className="text-muted-foreground">All messages have been reviewed. Great work!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-6">
      <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Smartphone className="h-3 w-3" />
            <span>Mobile: Swipe to approve or send to review</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1">
            <Keyboard className="h-3 w-3" />
            <span>Desktop: Press A to Approve, R for Review, U to Undo</span>
          </div>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-180px)]">
        <div className="w-1/6 min-w-[200px]">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="text-sm">Cases to Review</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-3">
                <div className="space-y-2">
                  {reviewMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedMessageId === message.id ? "bg-accent border-accent-foreground" : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedMessageId(message.id)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span className="text-xs font-medium truncate">{message.customerName}</span>
                      </div>
                      <Badge variant="outline" className="text-xs mb-1">
                        {message.category}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{new Date(message.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-3/6 flex flex-col gap-4">
          {selectedMessage && (
            <>
              <Card className="flex-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Customer Question</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={selectedMessage.priority === "high" ? "destructive" : "secondary"}>
                        {selectedMessage.priority}
                      </Badge>
                      <Badge variant="outline">{selectedMessage.category}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{selectedMessage.customerName}</span>
                      <Separator orientation="vertical" className="h-4" />
                      <Clock className="h-4 w-4" />
                      <span>{new Date(selectedMessage.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm leading-relaxed">{selectedMessage.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Draft Reply</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Edit the AI-generated response or write your own..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleApprove} className="flex-1">
                      <Send className="h-4 w-4 mr-2" />
                      Approve & Send
                    </Button>
                    <Button onClick={handleSendToReview} variant="outline" className="flex-1 bg-transparent">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send to Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="w-2/6">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Ask me anything about this case</p>
                    </div>
                  )}
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === "agent" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] p-2 rounded-lg text-xs ${
                          msg.sender === "agent" ? "bg-accent text-accent-foreground" : "bg-muted"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-3 border-t border-b bg-muted/30">
                <div className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Quick Actions
                  </p>
                  <div className="space-y-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMacroClick("translate_to_spanish")}
                      className="w-full justify-start text-xs h-8 bg-background hover:bg-accent"
                      title="Translate AI response to Spanish and send to conversation field"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Translate to Spanish
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMacroClick("use_last_ai_response")}
                      className="w-full justify-start text-xs h-8 bg-background hover:bg-accent"
                      title="Send the last AI response to conversation field"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Use AI Response
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMacroClick("custom_action")}
                      className="w-full justify-start text-xs h-8 bg-background hover:bg-accent"
                      title="Execute your custom macro from settings"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Custom Macro
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Ask AI about this case..."
                    value={aiChatInput}
                    onChange={(e) => setAiChatInput(e.target.value)}
                    className="flex-1 min-h-[60px] resize-none text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleAiChat()
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleAiChat} disabled={!aiChatInput.trim()}>
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
