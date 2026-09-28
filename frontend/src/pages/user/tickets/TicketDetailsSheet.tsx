import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { ErrorState, PageLoading } from "@/components/feedback";
import { StatusBadge } from "@/components/status";
import { DetailSection, Timeline, type TimelineStep } from "@/components/ui/detail-sheet";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ROUTES } from "@/router/routes";
import { getTenantTicket } from "@/shared/api/user/tickets.api";
import type { TenantTicket } from "@/shared/types/ticket";
import { formatDate } from "@/shared/utils/dateFormatter";
import { TICKET_TYPE_LABELS } from "@/shared/utils/ticketTypes";

function TicketDetailsSheet() {
  const { ticketId = "" } = useParams();
  const navigate = useNavigate();

  return (
    <Sheet
      open={ticketId !== ""}
      onOpenChange={(open) => {
        if (!open) void navigate(ROUTES.user.tickets);
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {ticketId ? <TicketDetails key={ticketId} ticketID={ticketId} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function TicketDetails({ ticketID }: { ticketID: string }) {
  const [ticket, setTicket] = useState<TenantTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getTenantTicket(ticketID, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setTicket(result);
        setIsLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError("This ticket could not be loaded.");
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [ticketID, retryToken]);

  function retry() {
    setIsLoading(true);
    setError("");
    setRetryToken((token) => token + 1);
  }

  return (
    <>
      <SheetHeader className="border-b border-hairline pr-12">
        <div className="flex flex-wrap items-center gap-2.5">
          <SheetTitle className="text-xl">
            {ticket ? TICKET_TYPE_LABELS[ticket.type] : "Ticket"}
          </SheetTitle>
          {ticket ? <StatusBadge domain="ticket" status={ticket.status} /> : null}
        </div>
        <SheetDescription>
          {ticket?.displayID ?? "Loading the ticket you reported"}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 px-4 pb-4">
        {isLoading ? (
          <PageLoading title="Loading ticket" description="Fetching your report..." />
        ) : null}
        {error ? <ErrorState description={error} onRetry={retry} /> : null}
        {!isLoading && !error && ticket ? (
          <>
            <DetailSection title="What you reported" bordered={false}>
              {ticket.location ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">Where </span>
                  <span className="font-medium text-foreground">{ticket.location}</span>
                </p>
              ) : null}
              <p className="whitespace-pre-wrap text-sm leading-6 text-body">
                {ticket.description || "No description was given."}
              </p>
              {ticket.image ? <TicketPhoto ticket={ticket} /> : null}
            </DetailSection>
            <Timeline steps={buildTimeline(ticket)} />
          </>
        ) : null}
      </div>
    </>
  );
}

function buildTimeline(ticket: TenantTicket): TimelineStep[] {
  return [
    { label: "Raised", value: formatDate(ticket.createDate, true), reached: true },
    {
      label: "Work started",
      value: ticket.status === "need_action" ? "Not yet" : "Owner took it on",
      reached: ticket.status !== "need_action",
    },
    {
      label: "Done",
      value: ticket.resolveDate ? formatDate(ticket.resolveDate, true) : "Not yet",
      reached: ticket.status === "done",
    },
  ];
}

function TicketPhoto({ ticket }: { ticket: TenantTicket }) {
  const [hasError, setHasError] = useState(false);
  if (hasError) {
    return (
      <p className="flex h-28 items-center justify-center rounded-md border border-hairline bg-page text-sm text-muted-foreground">
        Photo unavailable
      </p>
    );
  }
  return (
    <a href={ticket.image} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-hairline">
      <img
        src={ticket.image}
        alt={`Photo attached to ticket ${ticket.displayID}`}
        className="max-h-52 w-full object-cover"
        onError={() => setHasError(true)}
      />
    </a>
  );
}

export { TicketDetailsSheet };
