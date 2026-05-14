"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"

export function DashboardSidebarWrapper({ isAdmin = false }: { isAdmin?: boolean }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <Sidebar
      current="Dashboard"
      expanded={expanded}
      onExpandedChange={setExpanded}
      isAdmin={isAdmin}
    />
  )
}
