export const dynamic = "force-dynamic"

import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetCurrentUser } from "@/lib/db/users"
import { ConnectorsShell } from "@/components/connectors/connectors-shell"
import { SidebarWrapper } from "@/components/sidebar-wrapper"

export const metadata = { title: "Connectors — SECC" }

export default async function ConnectorsPage() {
  const db   = await createSupabaseServerClient()
  const user = await dbGetCurrentUser(db)

  if (!user) redirect("/login")

  return (
    <div className="flex min-h-screen">
      <SidebarWrapper current="Connectors" />
      <main className="flex-1 pl-[76px] md:pl-[232px]">
        {/* Suspense required because ConnectorsShell uses useSearchParams */}
        <Suspense>
          <ConnectorsShell user={user} />
        </Suspense>
      </main>
    </div>
  )
}
