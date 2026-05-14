"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MessageCircle, X, Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Message = { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "What should I focus on today?",
  "What tickets are blocked?",
  "How do I create a new ticket?",
]

function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === "user"
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded px-3 py-2 text-[13px] leading-relaxed",
          isUser
            ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] text-[var(--text)]"
            : "bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text)]"
        )}
      >
        {msg.content.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            {i < msg.content.split("\n").length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  )
}

export function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Keyboard shortcut: ? opens chat (only when not typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?" || streaming) return
      const target = e.target as HTMLElement
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) return
      e.preventDefault()
      setOpen((v) => !v)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [streaming])

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const submit = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || streaming) return

    const userMsg: Message = { role: "user", content: trimmed }
    const nextMessages: Message[] = [...messages, userMsg]
    setMessages(nextMessages)
    setInput("")
    setStreaming(true)

    // Placeholder for assistant streaming response
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    abortRef.current = new AbortController()

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: "assistant", content: "Something went wrong. Please try again." }
          return copy
        })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          copy[copy.length - 1] = { ...last, content: last.content + chunk }
          return copy
        })
      }
    } catch (err: unknown) {
      if ((err as { name?: string })?.name !== "AbortError") {
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: "assistant", content: "Something went wrong. Please try again." }
          return copy
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [messages, streaming])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit(input)
    }
  }

  const clearChat = () => {
    abortRef.current?.abort()
    setMessages([])
    setStreaming(false)
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Co-Analyst"
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-150",
          "bg-[var(--surface-2)] shadow-lg",
          open
            ? "border-[var(--accent)] text-[var(--accent)] shadow-[0_0_20px_color-mix(in_srgb,var(--accent)_20%,transparent)]"
            : "border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        )}
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            "fixed bottom-20 right-5 z-50 flex flex-col overflow-hidden rounded-lg border shadow-2xl",
            "border-[var(--border-strong)] bg-[var(--surface-2)]",
            "w-[360px] h-[500px]",
            "shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
          )}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Co-Analyst
              </span>
            </div>
            <button
              onClick={clearChat}
              className="text-[11px] text-[var(--text-faint)] transition-colors hover:text-[var(--text-muted)]"
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col justify-end gap-3">
                <p className="text-center text-[12px] text-[var(--text-faint)]">
                  Ask me about your tickets or how to use the platform.
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      className="rounded border border-[var(--border)] px-3 py-2 text-left text-[12px] text-[var(--text-muted)] transition-colors hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)] hover:bg-[var(--accent-soft)] hover:text-[var(--text)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)
            )}
            {/* Streaming cursor */}
            {streaming && messages.length > 0 && messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].content === "" && (
              <div className="flex justify-start">
                <div className="rounded bg-[var(--surface-3)] border border-[var(--border)] px-3 py-2">
                  <Loader2 size={14} className="animate-spin text-[var(--text-faint)]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-[var(--border)] p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask anything… (Enter to send)"
                rows={1}
                disabled={streaming}
                className={cn(
                  "flex-1 resize-none rounded border bg-[var(--surface-3)] px-3 py-2 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)]",
                  "border-[var(--border)] outline-none transition-colors",
                  "focus:border-[var(--accent)]",
                  "disabled:opacity-50",
                  "max-h-[100px] min-h-[36px]",
                  "font-[family-name:var(--font-sans)]"
                )}
                style={{ height: "auto" }}
                onInput={(e) => {
                  const el = e.currentTarget
                  el.style.height = "auto"
                  el.style.height = Math.min(el.scrollHeight, 100) + "px"
                }}
              />
              <button
                onClick={() => submit(input)}
                disabled={!input.trim() || streaming}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded border transition-all",
                  "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]",
                  "hover:bg-[color-mix(in_srgb,var(--accent)_25%,transparent)]",
                  "disabled:cursor-not-allowed disabled:opacity-40"
                )}
              >
                {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
            <p className="mt-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
              ? to toggle · Shift+Enter for newline
            </p>
          </div>
        </div>
      )}
    </>
  )
}
