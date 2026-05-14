"use client"

import { useCallback, useEffect, useState } from "react"
import { DashboardHeader } from "./dashboard-header"
import { MetricCardWidget } from "./metric-card"
import { NarrativeCard } from "./narrative-card"
import { StatusDistributionChart } from "./status-distribution-chart"
import { PriorityDistributionChart } from "./priority-distribution-chart"
import { OwnerWorkloadChart } from "./owner-workload-chart"
import { TicketListCard } from "./ticket-list-card"
import { RecentMovementCard } from "./recent-movement-card"
import { InitiativeDistributionCard } from "./initiative-distribution-card"
import type { DashboardData, DashboardRange, DashboardScope } from "@/lib/dashboard/dashboard-types"

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5 ${className ?? ""}`}>
      <div className="mb-3 h-3 w-2/5 rounded-md bg-[var(--surface-3)]" />
      <div className="mb-2 h-8 w-1/3 rounded-md bg-[var(--surface-3)]" />
      <div className="h-3 w-1/4 rounded-md bg-[var(--surface-2)]" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded border-[0.5px] border-[var(--border)] bg-[var(--surface)] py-20 text-center">
      <p className="mb-1 text-[15px] font-medium text-[var(--text)]">No dashboard data yet.</p>
      <p className="mb-5 text-[13px] text-[var(--text-faint)]">
        Create your first ticket to start seeing workload, blockers, and progress insights.
      </p>
      <a
        href="/tickets"
        className="rounded border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-4 py-2 text-[13px] font-medium text-[var(--accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
      >
        New ticket
      </a>
    </div>
  )
}

export function DashboardShell() {
  const [scope, setScope]           = useState<DashboardScope>("my")
  const [range, setRange]           = useState<DashboardRange>("this_week")
  const [data, setData]             = useState<DashboardData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const load = useCallback(
    async (s: DashboardScope, r: DashboardRange) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/dashboard?scope=${s}&range=${r}`)
        if (!res.ok) throw new Error(await res.text())
        setData(await res.json())
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard.")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => { load(scope, range) }, [load, scope, range])

  const handleScopeChange = (s: DashboardScope) => { setScope(s); setData(null) }
  const handleRangeChange = (r: DashboardRange) => { setRange(r); setData(null) }
  const handleRefresh     = () => load(scope, range)

  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-6 md:px-8">
      <DashboardHeader
        scope={scope}
        range={range}
        generatedAt={data?.generatedAt}
        loading={loading}
        onScopeChange={handleScopeChange}
        onRangeChange={handleRangeChange}
        onRefresh={handleRefresh}
      />

      {error && (
        <div className="mb-6 rounded-[12px] border-[0.5px] border-[color-mix(in_srgb,var(--status-blocked)_30%,transparent)] bg-[color-mix(in_srgb,var(--status-blocked)_8%,transparent)] px-4 py-3 text-[13px] text-[var(--status-blocked)]">
          {error}
        </div>
      )}

      {loading && !data ? (
        scope === "my" ? <MyDashboardSkeleton /> : <TeamDashboardSkeleton />
      ) : !data || data.metrics.every((m) => m.value === 0) ? (
        <EmptyState />
      ) : scope === "my" ? (
        <MyDashboardLayout data={data} />
      ) : (
        <TeamDashboardLayout data={data} />
      )}
    </div>
  )
}

function MyDashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SkeletonCard className="lg:col-span-2" />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}

function TeamDashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <SkeletonCard />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}

function MyDashboardLayout({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-5">
      {/* Row 1: metric cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {data.metrics.map((m) => (
          <MetricCardWidget key={m.key} metric={m} />
        ))}
      </div>

      {/* Row 2: narrative + focus */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <NarrativeCard narrative={data.narrative} className="lg:col-span-1" />
        <TicketListCard
          title="Today's Focus"
          tickets={data.focusItems ?? []}
          emptyMessage="Nothing urgent right now. Your queue is clean."
          className="lg:col-span-2"
        />
      </div>

      {/* Row 3: status + priority */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatusDistributionChart data={data.statusDistribution} />
        <PriorityDistributionChart data={data.priorityDistribution} />
      </div>

      {/* Row 4: due soon + blockers + completed */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TicketListCard
          title="Due Soon / Overdue"
          tickets={data.dueSoon ?? []}
          emptyMessage="No upcoming deadlines in your queue."
        />
        <TicketListCard
          title="My Blockers"
          tickets={data.blockers}
          emptyMessage="No blocked tickets."
        />
        <TicketListCard
          title="Recently Completed"
          tickets={data.recentlyCompleted}
          emptyMessage="No completions this period."
        />
      </div>
    </div>
  )
}

function TeamDashboardLayout({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-5">
      {/* Row 1: metric cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {data.metrics.map((m) => (
          <MetricCardWidget key={m.key} metric={m} />
        ))}
      </div>

      {/* Row 2: narrative full width */}
      <NarrativeCard narrative={data.narrative} />

      {/* Row 3: status + priority */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatusDistributionChart data={data.statusDistribution} />
        <PriorityDistributionChart data={data.priorityDistribution} />
      </div>

      {/* Row 4: owner workload + initiative distribution */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <OwnerWorkloadChart data={data.ownerWorkload ?? []} />
        {data.initiativeDistribution && data.initiativeDistribution.length > 0 && (
          <InitiativeDistributionCard data={data.initiativeDistribution} />
        )}
      </div>

      {/* Row 5: blockers + recent movement */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TicketListCard
          title="Blocked Work"
          tickets={data.blockers}
          emptyMessage="No blocked tickets. The team is flowing."
        />
        <RecentMovementCard tickets={data.recentMovement} />
      </div>
    </div>
  )
}
