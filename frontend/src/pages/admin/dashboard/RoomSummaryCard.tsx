import { AppTooltip } from '@/components/ui/tooltip'
import type { AdminDashboardRoomSummary } from '@/shared/types/admin/dashboard'

const segments = [
  ['availableNow', 'Available now', 'bg-chart-2'],
  ['rented', 'Rented', 'bg-chart-1'],
  ['availableSoon', 'Available soon', 'bg-chart-4'],
  ['notAvailable', 'Not available', 'bg-chart-5'],
] as const

function RoomSummaryCard({ summary, onOpen }: { summary: AdminDashboardRoomSummary; onOpen: (status: string) => void }) {
  return (
    <section className="grid gap-4 rounded-xl border border-hairline bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-foreground">Room summary</h2>
          <p className="mt-1 text-sm text-muted-foreground">Current status across all {summary.total} rooms</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums">{summary.occupancyRate}%</div>
          <div className="mt-1 text-xs text-muted-foreground">{summary.rented} occupied</div>
        </div>
      </div>

      <div className="flex h-4 gap-0.5 overflow-hidden rounded-full bg-muted" aria-label="Room status breakdown">
        {segments.map(([key, label, color]) => summary[key] > 0 ? (
          <AppTooltip key={key} content={`${label}: ${summary[key]} ${summary[key] === 1 ? 'room' : 'rooms'}`}>
            <button
              type="button"
              aria-label={`${label}: ${summary[key]} ${summary[key] === 1 ? 'room' : 'rooms'}`}
              className={`${color} min-w-1 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white`}
              style={{ flex: summary[key] }}
              onClick={() => onOpen(label.toLowerCase())}
            />
          </AppTooltip>
        ) : null)}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {segments.map(([key, label, color]) => (
          <button
            type="button"
            key={key}
            onClick={() => onOpen(label.toLowerCase())}
            className="flex items-center gap-2 rounded-lg border border-hairline p-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand"
          >
            <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-sm ${color}`} />
            <span className="text-xs text-muted-foreground">{label}</span>
            <strong className="ml-auto text-lg tabular-nums">{summary[key]}</strong>
          </button>
        ))}
      </div>
    </section>
  )
}

export { RoomSummaryCard }
