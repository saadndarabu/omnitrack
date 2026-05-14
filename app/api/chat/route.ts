import { createSupabaseServerClient } from "@/lib/supabase/server"

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages"

type ChatMessage = { role: "user" | "assistant"; content: string }

async function buildTicketContext(db: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  try {
    // Status counts
    const { data: rows } = await db
      .from("tickets")
      .select("status, priority")
      .is("parent_id", null)

    if (!rows) return ""

    const byCounts: Record<string, number> = {}
    const critical: string[] = []

    for (const r of rows) {
      byCounts[r.status] = (byCounts[r.status] ?? 0) + 1
      if (r.priority === "critical") critical.push(r.status)
    }

    const totalOpen = (byCounts["todo"] ?? 0) + (byCounts["in_progress"] ?? 0) + (byCounts["in_review"] ?? 0) + (byCounts["blocked"] ?? 0)

    // Recent blocked + high-priority tickets (just title/id for context)
    const { data: hotTickets } = await db
      .from("tickets")
      .select("id, title, status, priority, project, due_date")
      .is("parent_id", null)
      .in("status", ["blocked", "in_progress", "in_review"])
      .in("priority", ["critical", "high"])
      .order("priority", { ascending: true })
      .order("updated_at", { ascending: false })
      .limit(10)

    const statusSummary = Object.entries(byCounts)
      .map(([s, n]) => `${s}: ${n}`)
      .join(", ")

    let ctx = `Current ticket snapshot:\n- Status counts: ${statusSummary}\n- Total open: ${totalOpen}\n- Critical tickets: ${critical.length}`

    if (hotTickets && hotTickets.length > 0) {
      ctx += "\n\nHigh-priority active tickets:\n"
      for (const t of hotTickets) {
        ctx += `  • [${t.id}] ${t.title} (${t.status}, ${t.priority}${t.project ? `, ${t.project}` : ""}${t.due_date ? `, due ${t.due_date}` : ""})\n`
      }
    }

    return ctx
  } catch {
    return ""
  }
}

// POST /api/chat
// Body: { messages: ChatMessage[] }
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response("ANTHROPIC_API_KEY not configured", { status: 503 })
  }

  const { messages }: { messages: ChatMessage[] } = await request.json()
  if (!messages?.length) {
    return new Response("messages is required", { status: 400 })
  }

  // Fetch live ticket context to give Claude up-to-date data
  let ticketContext = ""
  try {
    const db = await createSupabaseServerClient()
    ticketContext = await buildTicketContext(db)
  } catch {
    // Continue without context if DB is unreachable
  }

  const systemPrompt = `You are the Co-Analyst for SECC (SIRP Engineering Command Center), the internal engineering ticket tracker for SIRP.

You help engineers with two things:
1. Answering questions about their tickets and workload — "What should I focus on?", "What's blocked?", "How many critical bugs are open?"
2. Explaining how to use the platform — "How do I filter tickets?", "How do I create a ticket?", "What keyboard shortcuts are there?"

Key platform features:
- Keyboard shortcuts: c = new ticket, Cmd+K = command menu, / = search, j/k = navigate, Enter = open, 1-5 = set status, a = assign, r = reopen, e = edit title
- Views: table, kanban, dashboard (analytics)
- Status workflow: backlog → todo → in_progress → in_review → done (or blocked)
- AI-assisted ticket creation: press c and describe the work naturally
- GitHub integration: PRs auto-link to tickets by branch name

Be concise. Use bullet points for lists. When referencing a ticket use its SIRP-NNN ID format. If asked to perform actions (create/edit tickets), explain how to do it rather than doing it yourself.
${ticketContext ? `\n---\n${ticketContext}` : ""}`

  const upstreamRes = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      stream: true,
      system: systemPrompt,
      messages,
    }),
  })

  if (!upstreamRes.ok || !upstreamRes.body) {
    const text = await upstreamRes.text()
    return new Response(`Upstream error: ${text}`, { status: upstreamRes.status })
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      const reader = upstreamRes.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const data = line.slice(6).trim()
            if (!data || data === "[DONE]") continue
            try {
              const event = JSON.parse(data)
              if (
                event.type === "content_block_delta" &&
                event.delta?.type === "text_delta" &&
                event.delta.text
              ) {
                controller.enqueue(encoder.encode(event.delta.text))
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
