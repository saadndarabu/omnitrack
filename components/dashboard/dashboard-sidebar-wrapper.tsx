"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"

export function DashboardSidebarWrapper() {
  const [expanded, setExpanded] = useState(true)
  return (
    <Sidebar
      current="Dashboard"
      expanded={expanded}
      onExpandedChange={setExpanded}
    />
  )
}
