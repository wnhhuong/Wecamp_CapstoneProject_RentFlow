import type { AdminDashboardRoomSummary } from '@/shared/types/admin/dashboard'

const segments = [
  ['availableNow', 'Available now', 'bg-status-success-fg'],
  ['rented', 'Rented', 'bg-ink'],
  ['availableSoon', 'Available soon', 'bg-[#FFB162]'],
  ['notAvailable', 'Not available', 'bg-clay'],
] as const

function RoomSummaryCard({ summary, onOpen }: { summary: AdminDashboardRoomSummary; onOpen: (status: string) => void }) {
  return (
    <section className="grid gap-4 rounded-xl border border-hairline bg-surface p-5">
      <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-foreground">Room summary</h2><p className="mt-1 text-sm text-muted-foreground">Current status across all {summary.total} rooms</p></div><div className="text-right"><div className="text-2xl font-semibold tabular-nums">{summary.occupancyRate}%</div><div className="mt-1 text-xs text-muted-foreground">{summary.rented} occupied</div></div></div>
      <div className="flex h-4 gap-0.5 overflow-hidden rounded-full bg-muted" aria-label={`Occupancy ${summary.occupancyRate}%`}>{segments.map(([key, label, color]) => <div key={key} className={color} style={{ flex: summary[key] }} title={`${label}: ${summary[key]}`} />)}</div>
      <div className="grid grid-cols-2 gap-2">{segments.map(([key, label, color]) => <button type="button" key={key} onClick={() => onOpen(label.toLowerCase())} className="flex items-center gap-2 rounded-lg border border-hairline p-3 text-left hover:bg-muted"><span className={`h-2.5 w-2.5 rounded-sm ${color}`} /><span className="text-xs text-muted-foreground">{label}</span><strong className="ml-auto text-lg tabular-nums">{summary[key]}</strong></button>)}</div>
    </section>
  )
}

export { RoomSummaryCard }
