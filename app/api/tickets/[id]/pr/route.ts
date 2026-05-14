import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createGithubPR } from "@/lib/github/oauth"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: connection } = await supabase
    .from("github_user_connections")
    .select("access_token")
    .eq("user_id", user.id)
    .single()

  if (!connection) {
    return NextResponse.json(
      { error: "Connect your GitHub account first in Settings → GitHub" },
      { status: 400 }
    )
  }

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, title, description, acceptance_criteria, branch, pr_number, target_repo")
    .eq("id", id)
    .single()

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
  if (ticket.pr_number) return NextResponse.json({ prNumber: ticket.pr_number })

  if (!ticket.branch) {
    return NextResponse.json({ error: "Create a branch before opening a PR" }, { status: 400 })
  }

  const body = (await request.json().catch(() => ({}))) as { base?: string }
  const repo = ticket.target_repo
  if (!repo) {
    return NextResponse.json({ error: "No repository set on this ticket" }, { status: 400 })
  }

  const prTitle = `[${ticket.id}] ${ticket.title}`
  const criteria = (ticket.acceptance_criteria ?? [])
    .map((c: string) => `- [ ] ${c}`)
    .join("\n")
  const prBody = [
    ticket.description,
    criteria ? `\n## Acceptance criteria\n${criteria}` : "",
    `\nCloses ${ticket.id}`
  ]
    .filter(Boolean)
    .join("\n")

  let prNumber: number
  try {
    prNumber = await createGithubPR(
      connection.access_token,
      repo,
      ticket.branch,
      body.base ?? "main",
      prTitle,
      prBody
    )
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PR creation failed" },
      { status: 502 }
    )
  }

  await supabase
    .from("tickets")
    .update({ pr_number: prNumber, status: "in_review" })
    .eq("id", id)

  return NextResponse.json({ prNumber })
}
