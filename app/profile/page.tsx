export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetCurrentUser } from "@/lib/db/users"
import { ProfileShell } from "@/components/profile/profile-shell"
import { SidebarWrapper } from "@/components/sidebar-wrapper"

export const metadata = { title: "Profile — SECC" }

export default async function ProfilePage() {
  const db   = await createSupabaseServerClient()
  const user = await dbGetCurrentUser(db)

  if (!user) redirect("/login")

  return (
    <div className="flex min-h-screen">
      <SidebarWrapper current="Profile" githubConnected={!!user.githubUsername} />
      <main className="flex-1 pl-[76px] md:pl-[232px]">
        <ProfileShell user={user} />
      </main>
    </div>
  )
}
