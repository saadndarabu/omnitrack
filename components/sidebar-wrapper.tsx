"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"

export function SidebarWrapper({ current }: { current?: string }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <Sidebar
      current={current}
      expanded={expanded}
      onExpandedChange={setExpanded}
    />
  )
}
