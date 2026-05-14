import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getMyDashboardData, getTeamDashboardData } from "@/lib/dashboard/get-dashboard-data"
import type { DashboardRange } from "@/lib/dashboard/dashboard-types"
import { currentUser } from "@/lib/mock-data"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const scope = searchParams.get("scope") === "team" ? "team" : "my"
    const rangeParam = searchParams.get("range") ?? "this_week"
    const range: DashboardRange =
      rangeParam === "7d" || rangeParam === "30d" ? rangeParam : "this_week"

    const db = await createSupabaseServerClient()

    const data =
      scope === "team"
        ? await getTeamDashboardData(db, range)
        : await getMyDashboardData(db, currentUser.id, range)

    return NextResponse.json(data)
  } catch (err) {
    console.error("[dashboard/route]", err)
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 })
  }
}
