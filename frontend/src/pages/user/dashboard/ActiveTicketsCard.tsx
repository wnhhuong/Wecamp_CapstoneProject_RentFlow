import { Link } from "react-router";

import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { ROUTES } from "@/router/routes";
import type { DashboardTicket } from "@/shared/types/dashboard";

function ActiveTicketsCard({
  tickets,
  onNewTicket,
}: {
  tickets: DashboardTicket[];
  onNewTicket: () => void;
}) {
  return (
    <section className="grid min-w-0 gap-3 rounded-xl border border-hairline bg-surface p-5 [&>*]:min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
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
        <div className="ml-auto flex items-center gap-3">
          <Button type="button" variant="dark" size="sm" onClick={onNewTicket}>
            <PlusIcon />
            New
          </Button>
        </div>
      </div>

      {tickets.slice(0, 3).map((ticket) => (
        <Link
          key={ticket.ticketID}
          to={ROUTES.user.ticketDetailsLink(ticket.ticketID)}
          className="flex items-center gap-3 rounded-md border-b border-hairline py-2.5 transition-colors last:border-0 hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand"
        >
          <StatusBadge domain="ticketType" status={ticket.type} />
          <span className="min-w-0 flex-1 truncate text-sm text-body">
            {ticket.description || "No description"}
          </span>
          <StatusBadge domain="ticket" status={ticket.status} />
        </Link>
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
