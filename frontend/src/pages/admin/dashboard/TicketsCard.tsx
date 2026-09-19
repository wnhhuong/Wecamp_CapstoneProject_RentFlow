import type { AdminDashboardTicket } from '@/shared/types/admin/dashboard'
import { formatDate } from '@/shared/utils/dateFormatter'

function TicketsCard({ tickets, onOpen }: { tickets: AdminDashboardTicket[]; onOpen: () => void }) {
  return <section className="grid gap-3 rounded-xl border border-hairline bg-surface p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Ticket summary</h2><p className="mt-1 text-sm text-muted-foreground">Tickets waiting for the admin to act</p></div><button type="button" onClick={onOpen} className="text-sm font-medium text-clay hover:underline">View all →</button></div>{tickets.slice(0, 3).map((ticket) => <button type="button" key={ticket.ticketID} onClick={onOpen} className="flex items-center gap-3 border-b border-hairline py-2.5 text-left last:border-0"><span className="h-2 w-2 shrink-0 rounded-full bg-clay" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{ticket.typeLabel}</strong><span className="block truncate text-xs text-muted-foreground">{ticket.ticketName} · {ticket.location} · {formatDate(ticket.createDate)}</span></span><span className="text-xs font-medium text-clay">NEED ACTION</span></button>)}{tickets.length === 0 ? <div className="rounded-lg border border-dashed border-hairline px-3 py-6 text-center text-sm text-muted-foreground">No tickets need action right now.</div> : null}</section>
}

export { TicketsCard }
