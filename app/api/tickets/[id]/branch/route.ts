import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createGithubBranch } from "@/lib/github/oauth"
import { toBranchName } from "@/lib/ids"

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
    .select("id, title, branch, target_repo")
    .eq("id", id)
    .single()

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
  if (ticket.branch) return NextResponse.json({ branch: ticket.branch })

  const body = (await request.json().catch(() => ({}))) as { repo?: string; base?: string }
  const repo = body.repo ?? ticket.target_repo
  if (!repo) {
    return NextResponse.json(
      { error: "No repository set. Pass a repo in the request body or set one on the ticket." },
      { status: 400 }
    )
  }

  const branchName = toBranchName("task", ticket.id, ticket.title)

  try {
    await createGithubBranch(connection.access_token, repo, branchName, body.base ?? "main")
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Branch creation failed" },
      { status: 502 }
    )
  }

  await supabase
    .from("tickets")
    .update({ branch: branchName, target_repo: repo })
    .eq("id", id)

  return NextResponse.json({ branch: branchName })
}
