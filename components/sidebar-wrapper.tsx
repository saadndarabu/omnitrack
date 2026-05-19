"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"

export function SidebarWrapper({
  current,
  githubConnected,
}: {
  current?: string
  githubConnected?: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  return (
    <Sidebar
      current={current}
      expanded={expanded}
      onExpandedChange={setExpanded}
      githubConnected={githubConnected}
    />
  )
}
