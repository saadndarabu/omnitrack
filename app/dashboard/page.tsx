import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardSidebarWrapper } from "@/components/dashboard/dashboard-sidebar-wrapper"

export const metadata = { title: "Dashboard — SECC" }

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen">
      <DashboardSidebarWrapper />
      <main className="flex-1 pl-[76px] md:pl-[232px]">
        <DashboardShell />
      </main>
    </div>
  )
}
