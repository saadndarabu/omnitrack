"use client"

import { useMemo, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnFiltersState,
  type ColumnOrderState,
  type SortingState,
  type VisibilityState,
  useReactTable
} from "@tanstack/react-table"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Search,
  SlidersHorizontal,
  X
} from "lucide-react"
import { Avatar } from "@/components/avatar"
import { StatusIcon } from "@/components/status-icon"
import { Popover } from "@/components/ui/popover"
import {
  COLUMN_LABELS,
  DEFAULT_VISIBLE_COLUMNS,
  createTicketColumns
} from "@/components/ticket-table-columns"
import { STATUS_LABELS, STATUSES, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"
import type { Priority, Ticket } from "@/types/ticket"
import type { User } from "@/types/user"

const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"]
const PRIORITY_LABELS: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low"
}
const PRIORITY_DOT: Record<Priority, string> = {
  critical: "bg-[var(--status-blocked)]",
  high: "bg-[var(--status-progress)]",
  medium: "bg-[var(--status-review)]",
  low: "bg-[var(--text-faint)]"
}

const PAGE_SIZE = 25

export function TicketTable({
  onOpen,
  selectedId,
  tickets,
  users
}: {
  onOpen: (ticketId: string) => void
  selectedId: string | null
  tickets: Ticket[]
  users: User[]
}) {
  const columns = useMemo(() => createTicketColumns(), [])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_VISIBLE_COLUMNS
  )
  const [globalFilter, setGlobalFilter] = useState("")
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }])

  const table = useReactTable({
    data: tickets,
    columns,
    state: {
      columnFilters,
      columnOrder,
      columnVisibility,
      globalFilter,
      rowSelection,
      sorting
    },
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (ticket) => ticket.id,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      if (!filterValue) {
        return true
      }
      const needle = filterValue.toLowerCase()
      const ticket = row.original
      return (
        ticket.id.toLowerCase().includes(needle) ||
        ticket.title.toLowerCase().includes(needle) ||
        ticket.description.toLowerCase().includes(needle) ||
        ticket.area.toLowerCase().includes(needle) ||
        ticket.component.toLowerCase().includes(needle) ||
        (ticket.assignee?.name.toLowerCase().includes(needle) ?? false) ||
        ticket.labels.some((label) => label.toLowerCase().includes(needle))
      )
    },
    onColumnFiltersChange: setColumnFilters,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    initialState: {
      pagination: { pageSize: PAGE_SIZE }
    }
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const columnIds = table.getVisibleLeafColumns().map((col) => col.id)

  function handleColumnDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setColumnOrder((current) => {
      const order = current.length ? current : columnIds
      const oldIndex = order.indexOf(String(active.id))
      const newIndex = order.indexOf(String(over.id))
      return arrayMove(order, oldIndex, newIndex)
    })
  }

  const rows = table.getRowModel().rows
  const totalFiltered = table.getFilteredRowModel().rows.length
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const rangeStart = totalFiltered === 0 ? 0 : pageIndex * pageSize + 1
  const rangeEnd = Math.min((pageIndex + 1) * pageSize, totalFiltered)
  const selectedCount = Object.keys(rowSelection).length
  const visibleColumnCount = table.getVisibleLeafColumns().length

  const statusFilter = (table.getColumn("status")?.getFilterValue() as Status | undefined) ?? null
  const priorityFilter =
    (table.getColumn("priority")?.getFilterValue() as Priority | undefined) ?? null
  const ownerFilter = (table.getColumn("owner")?.getFilterValue() as string | undefined) ?? null

  const activeFilters: Array<{ key: string; label: string; onClear: () => void }> = []
  if (statusFilter) {
    activeFilters.push({
      key: "status",
      label: `Status: ${STATUS_LABELS[statusFilter]}`,
      onClear: () => table.getColumn("status")?.setFilterValue(undefined)
    })
  }
  if (priorityFilter) {
    activeFilters.push({
      key: "priority",
      label: `Priority: ${PRIORITY_LABELS[priorityFilter]}`,
      onClear: () => table.getColumn("priority")?.setFilterValue(undefined)
    })
  }
  if (ownerFilter) {
    activeFilters.push({
      key: "owner",
      label: `Owner: ${ownerFilter}`,
      onClear: () => table.getColumn("owner")?.setFilterValue(undefined)
    })
  }

  return (
    <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8">
      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        {/* Search */}
        <div className="relative flex h-[40px] min-w-0 max-w-[280px] flex-1 items-center">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 text-[var(--text-faint)]"
          />
          <input
            type="text"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Search tickets…"
            aria-label="Search tickets"
            className="h-[40px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-[13px] text-[var(--text)] shadow-[0_1px_1px_rgba(0,0,0,0.02)] placeholder:text-[var(--text-faint)] focus-visible:focus-input focus-visible:outline-none"
          />
          {globalFilter ? (
            <button
              type="button"
              onClick={() => setGlobalFilter("")}
              aria-label="Clear search"
              className="absolute right-2 inline-flex h-5 w-5 items-center justify-center rounded-md text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              <X size={12} />
            </button>
          ) : null}
        </div>

        {/* Filters */}
        <Popover
          panelClassName="w-[280px] p-3"
          trigger={
            <button
              type="button"
              className={cn(
                "inline-flex h-[40px] items-center gap-1.5 rounded-xl border px-3 text-[13px] font-medium shadow-[0_1px_1px_rgba(0,0,0,0.02)] transition-colors",
                activeFilters.length > 0
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
              )}
            >
              <SlidersHorizontal size={13} />
              Filters
              {activeFilters.length > 0 ? (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-[var(--accent)] px-1 text-[10px] font-semibold text-white">
                  {activeFilters.length}
                </span>
              ) : null}
            </button>
          }
        >
          {(close) => (
            <div className="flex flex-col gap-4">
              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-[650] uppercase tracking-[0.06em] text-[var(--text-faint)]">Status</span>
                  {statusFilter ? (
                    <button
                      type="button"
                      onClick={() => table.getColumn("status")?.setFilterValue(undefined)}
                      className="text-[11px] text-[var(--text-faint)] transition-colors hover:text-[var(--text)]"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <FilterList
                  items={STATUSES.map((status) => ({
                    value: status,
                    label: STATUS_LABELS[status],
                    leading: <StatusIcon status={status} size={14} />
                  }))}
                  value={statusFilter}
                  onSelect={(value) => {
                    table.getColumn("status")?.setFilterValue(value === statusFilter ? undefined : value)
                  }}
                />
              </div>

              {/* Priority */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-[650] uppercase tracking-[0.06em] text-[var(--text-faint)]">Priority</span>
                  {priorityFilter ? (
                    <button
                      type="button"
                      onClick={() => table.getColumn("priority")?.setFilterValue(undefined)}
                      className="text-[11px] text-[var(--text-faint)] transition-colors hover:text-[var(--text)]"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <FilterList
                  items={PRIORITIES.map((priority) => ({
                    value: priority,
                    label: PRIORITY_LABELS[priority],
                    leading: <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[priority])} />
                  }))}
                  value={priorityFilter}
                  onSelect={(value) => {
                    table.getColumn("priority")?.setFilterValue(value === priorityFilter ? undefined : value)
                  }}
                />
              </div>

              {/* Owner */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-[650] uppercase tracking-[0.06em] text-[var(--text-faint)]">Owner</span>
                  {ownerFilter ? (
                    <button
                      type="button"
                      onClick={() => table.getColumn("owner")?.setFilterValue(undefined)}
                      className="text-[11px] text-[var(--text-faint)] transition-colors hover:text-[var(--text)]"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <FilterList
                  items={[
                    { value: "Unassigned", label: "Unassigned", leading: <Avatar user={null} size={22} /> },
                    ...users.map((user) => ({
                      value: user.name,
                      label: user.name,
                      leading: <Avatar user={user} size={22} />
                    }))
                  ]}
                  value={ownerFilter}
                  onSelect={(value) => {
                    table.getColumn("owner")?.setFilterValue(value === ownerFilter ? undefined : value)
                  }}
                />
              </div>

              {activeFilters.length > 0 ? (
                <button
                  type="button"
                  onClick={() => { table.resetColumnFilters(); close() }}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] py-1.5 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                >
                  Clear all filters
                </button>
              ) : null}
            </div>
          )}
        </Popover>

        {/* Columns */}
        <Popover
          align="end"
          panelClassName="w-[200px] p-1"
          trigger={
            <button
              type="button"
              className="inline-flex h-[40px] items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--text-muted)] shadow-[0_1px_1px_rgba(0,0,0,0.02)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
            >
              <SlidersHorizontal size={13} />
              Columns
              <span className="text-[11px] text-[var(--text-faint)]">{visibleColumnCount}</span>
            </button>
          }
        >
          {() => (
            <div className="max-h-[320px] overflow-y-auto">
              {table.getAllLeafColumns().filter((column) => column.getCanHide()).map((column) => {
                const label = COLUMN_LABELS[column.id] ?? column.id
                const checked = column.getIsVisible()
                return (
                  <button
                    key={column.id}
                    type="button"
                    onClick={() => column.toggleVisibility(!checked)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[12px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                  >
                    <span>{label}</span>
                    {checked ? <Check size={13} className="text-[var(--accent)]" /> : null}
                  </button>
                )
              })}
            </div>
          )}
        </Popover>

        {/* Active filter chips */}
        {activeFilters.map((filter) => (
          <span
            key={filter.key}
            className="inline-flex h-[40px] items-center gap-1.5 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 text-[12px] font-medium text-[var(--accent)]"
          >
            {filter.label}
            <button
              type="button"
              onClick={filter.onClear}
              aria-label={`Remove ${filter.label} filter`}
              className="rounded p-0.5 transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>

      {/* Table shell */}
      <DndContext id="ticket-table-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColumnDragEnd}>
        <div
          className="overflow-hidden rounded-[18px] border border-[#E5E1DA] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_rgba(16,24,40,0.04)]"
        >
          <div className="max-h-[calc(100vh-220px)] overflow-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="group/thead sticky top-0 z-[1]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <SortableContext key={headerGroup.id} items={columnIds} strategy={horizontalListSortingStrategy}>
                    <tr>
                      {headerGroup.headers.map((header) => (
                        <DraggableHeader key={header.id} header={header} />
                      ))}
                    </tr>
                  </SortableContext>
                ))}
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleColumnCount}
                      className="px-4 py-16 text-center text-[13px] text-[var(--text-faint)]"
                    >
                      No tickets match the current filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const isSelected = row.getIsSelected()
                    const isCurrent = row.original.id === selectedId
                    return (
                      <tr
                        key={row.id}
                        onClick={() => onOpen(row.original.id)}
                        aria-current={isCurrent ? "true" : undefined}
                        data-ticket-id={row.original.id}
                        className={cn(
                          "group cursor-pointer transition-colors duration-[120ms] ease-out",
                          isCurrent
                            ? "bg-[var(--accent-soft)] shadow-[inset_3px_0_0_var(--accent)]"
                            : isSelected
                              ? "bg-[var(--accent-soft)]"
                              : "hover:bg-[#FAF9F6]"
                        )}
                      >
                        {row.getVisibleCells().map((cell, cellIndex) => (
                          <td
                            key={cell.id}
                            className={cn(
                              "h-[58px] border-b border-[#EEEAE3] px-4 align-middle text-[13px] text-[var(--text-muted)] last:border-r-0",
                              // Vertical separator only after key group boundaries (col 0=checkbox, 1=id, 2=title)
                              cellIndex === 2 ? "border-r border-[#EEEAE3]" : ""
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-[#EEEAE3] bg-[#FAFAF8] px-4 py-2.5 text-[11px] text-[var(--text-faint)]">
            <span>
              {totalFiltered === 0
                ? "0 tickets"
                : `${rangeStart}–${rangeEnd} of ${totalFiltered} tickets`}
              {selectedCount > 0 ? (
                <span className="ml-2 text-[var(--text-muted)]">· {selectedCount} selected</span>
              ) : null}
            </span>
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Previous page"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-1 tabular-nums">
                {table.getPageCount() === 0 ? 1 : pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
              </span>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Next page"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </span>
          </div>
        </div>
      </DndContext>
    </div>
  )
}

function DraggableHeader({ header }: { header: import("@tanstack/react-table").Header<import("@/types/ticket").Ticket, unknown> }) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: header.id })
  const sortDir = header.column.getIsSorted()
  const canSort = header.column.getCanSort()
  const meta = header.column.columnDef.meta as { width?: string } | undefined

  return (
    <th
      ref={setNodeRef}
      scope="col"
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={cn(
        "border-b border-[#E5E1DA] bg-[#F3F1EC] px-4 py-3 text-left text-[11px] font-[650] uppercase tracking-[0.06em] text-[#5E6470] last:border-r-0",
        meta?.width
      )}
    >
      <span className="relative flex w-full items-center">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute -left-3 cursor-grab touch-none text-[var(--text-faint)] opacity-0 transition-opacity hover:text-[var(--text-muted)] group-hover/thead:opacity-100 active:cursor-grabbing"
          aria-label="Drag to reorder column"
        >
          <GripVertical size={12} />
        </button>
        {header.isPlaceholder ? null : canSort ? (
          <button
            type="button"
            onClick={header.column.getToggleSortingHandler()}
            className="inline-flex items-center gap-1 transition-colors hover:text-[var(--text)]"
          >
            {flexRender(header.column.columnDef.header, header.getContext())}
            <SortIndicator direction={sortDir} />
          </button>
        ) : (
          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
        )}
      </span>
    </th>
  )
}


function FilterList({
  items,
  value,
  onSelect
}: {
  items: Array<{ value: string; label: string; leading?: React.ReactNode }>
  value: string | null
  onSelect: (value: string) => void
}) {
  return (
    <div className="max-h-[280px] overflow-y-auto">
      {items.map((item) => {
        const active = value === item.value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition-colors",
              active
                ? "bg-[var(--surface-2)] text-[var(--text)]"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            )}
          >
            {item.leading ? <span className="shrink-0">{item.leading}</span> : null}
            <span className="flex-1 truncate">{item.label}</span>
            {active ? <Check size={13} className="text-[var(--accent)]" /> : null}
          </button>
        )
      })}
    </div>
  )
}

function SortIndicator({ direction }: { direction: false | "asc" | "desc" }) {
  if (!direction) {
    return (
      <span className="inline-flex h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
    )
  }
  return (
    <ChevronDown
      size={11}
      className={cn(
        "text-[var(--text-muted)] transition-transform",
        direction === "asc" && "rotate-180"
      )}
    />
  )
}

function CheckboxCell({
  checked,
  onChange,
  indeterminate,
  forceVisible,
  ...rest
}: {
  checked: boolean
  onChange: (value: boolean) => void
  indeterminate?: boolean
  forceVisible?: boolean
  "aria-label": string
}) {
  return (
    <label
      className={cn(
        "inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-[4px] border transition-[opacity,background-color,border-color] duration-[120ms]",
        checked || indeterminate
          ? "border-[var(--accent)] bg-[var(--accent)] opacity-100"
          : forceVisible
            ? "border-[var(--border-strong)] bg-transparent opacity-90 hover:border-[var(--text-faint)]"
            : "border-[var(--border-strong)] bg-transparent opacity-0 group-hover:opacity-90 hover:border-[var(--text-faint)]"
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={rest["aria-label"]}
      />
      {checked ? (
        <Check size={11} strokeWidth={3} className="text-white" />
      ) : indeterminate ? (
        <span className="block h-[2px] w-[8px] rounded-sm bg-white" />
      ) : null}
    </label>
  )
}
