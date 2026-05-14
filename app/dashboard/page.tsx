import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardSidebarWrapper } from "@/components/dashboard/dashboard-sidebar-wrapper"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetCurrentUser } from "@/lib/db/users"

export const metadata = { title: "Dashboard — SECC" }

export default async function DashboardPage() {
  const db = await createSupabaseServerClient()
  const currentUser = await dbGetCurrentUser(db)

  return (
    <div className="flex min-h-screen">
      <DashboardSidebarWrapper isAdmin={currentUser?.role === "admin"} />
      <main className="flex-1 pl-[76px] md:pl-[232px]">
        <DashboardShell />
      </main>
    </div>
  )
}
