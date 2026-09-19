import { Link } from "react-router";

import { StatusBadge } from "@/components/status";
import { ROUTES } from "@/router/routes";
import type { DashboardTicket } from "@/shared/types/dashboard";

function ActiveTicketsCard({ tickets }: { tickets: DashboardTicket[] }) {
  return (
    <section className="grid min-w-0 gap-3 rounded-xl border border-hairline bg-surface p-5 [&>*]:min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            Active tickets
            {tickets.length > 0 ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-body">
                {tickets.length}
              </span>
            ) : null}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Repairs and complaints not closed yet
          </p>
        </div>
        <Link
          to={ROUTES.user.tickets}
          className="shrink-0 text-sm font-medium whitespace-nowrap text-clay hover:underline"
        >
          View all →
        </Link>
      </div>

      {tickets.slice(0, 3).map((ticket) => (
        <div
          key={ticket.ticketID}
          className="flex items-center gap-3 border-b border-hairline py-2.5 last:border-0"
        >
          <StatusBadge domain="ticketType" status={ticket.type} />
          <span className="min-w-0 flex-1 truncate text-sm text-body">
            {ticket.description || "No description"}
          </span>
          <StatusBadge domain="ticket" status={ticket.status} />
        </div>
      ))}

      {tickets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hairline px-3 py-6 text-center text-sm text-muted-foreground">
          Nothing reported right now.
        </div>
      ) : null}
    </section>
  );
}

export { ActiveTicketsCard };
