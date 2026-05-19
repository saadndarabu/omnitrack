export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetCurrentUser } from "@/lib/db/users"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardSidebarWrapper } from "@/components/dashboard/dashboard-sidebar-wrapper"

export const metadata = { title: "Dashboard — SECC" }

export default async function DashboardPage() {
  const db   = await createSupabaseServerClient()
  const user = await dbGetCurrentUser(db)

  if (!user) redirect("/login")

  return (
    <div className="flex min-h-screen">
      <DashboardSidebarWrapper githubConnected={!!user.githubUsername} />
      <main className="flex-1 pl-[76px] md:pl-[232px]">
        <DashboardShell />
      </main>
    </div>
  )
}
