import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getGithubRepos } from "@/lib/github/oauth"

// GET — list repos available to the connected GitHub account
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: connection } = await supabase
    .from("github_user_connections")
    .select("access_token")
    .eq("user_id", user.id)
    .single()

  if (!connection) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 })
  }

  try {
    const repos = await getGithubRepos(connection.access_token)
    return NextResponse.json({ repos })
  } catch {
    return NextResponse.json({ error: "Failed to fetch repos from GitHub" }, { status: 502 })
  }
}

// POST — save selected repos to the allowlist
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  const body = (await request.json()) as { repos: Array<{ full_name: string; label?: string }> }

  if (!Array.isArray(body.repos)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  // Replace the allowlist: delete all then insert selected
  await supabase.from("github_repos").delete().neq("id", "00000000-0000-0000-0000-000000000000")

  if (body.repos.length > 0) {
    await supabase.from("github_repos").insert(
      body.repos.map(r => ({
        full_name: r.full_name,
        label: r.label ?? r.full_name.split("/")[1],
        added_by: user.id
      }))
    )
  }

  return NextResponse.json({ ok: true })
}
