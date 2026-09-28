import { useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";

import { StatusBadge } from "@/components/status";
import type { TicketsOutletContext } from "@/pages/admin/outlet-context";
import { ROUTES } from "@/router/routes";
import { Button } from "@/components/ui/button";
import {
  DetailSection,
  IdentityHeader,
  Timeline,
  type TimelineStep,
} from "@/components/ui/detail-sheet";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import {
  NEXT_STATUS,
  advanceTicketStatus,
} from "@/shared/api/admin/tickets.api";
import type { AdminTicket } from "@/shared/types/admin/ticket";
import { formatDate } from "@/shared/utils/dateFormatter";
import { TICKET_TYPE_LABELS } from "@/shared/utils/ticketTypes";

const ADVANCE_LABELS: Record<string, string> = {
  need_action: "Start work",
  in_progress: "Mark as done",
};

function TicketDetailsSheet() {
  const { ticketId = "" } = useParams();
  const navigate = useNavigate();
  const { tickets, onUpdated } = useOutletContext<TicketsOutletContext>();
  const ticket = tickets.find(item => item.ticketID === ticketId) ?? null;

  return (
    <Sheet
      open={ticket !== null}
      onOpenChange={open => {
        if (!open) void navigate(ROUTES.admin.tickets);
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {ticket ? (
          <TicketDetails
            key={ticket.ticketID}
            ticket={ticket}
            onUpdated={onUpdated}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function TicketDetails({
  ticket,
  onUpdated,
}: {
  ticket: AdminTicket;
  onUpdated: (ticket: AdminTicket) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const advanceLabel = ADVANCE_LABELS[ticket.status];

  async function advance() {
    if (isSaving || !NEXT_STATUS[ticket.status]) return;

    setIsSaving(true);
    setSaveError("");

    try {
      onUpdated(await advanceTicketStatus(ticket));
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "The ticket status could not be changed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <SheetHeader className="border-b border-hairline pr-12">
        <div className="flex flex-wrap items-center gap-2.5">
          <SheetTitle className="text-xl">
            {TICKET_TYPE_LABELS[ticket.type]}
          </SheetTitle>
          <StatusBadge domain="ticket" status={ticket.status} />
        </div>
        <SheetDescription>{ticket.displayID}</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 px-4 pb-4">
        <IdentityHeader
          title=""
          name={`Room ${ticket.roomCode}`}
          fallbackName="Unknown room"
          detail="Created this ticket"
          bordered={false}
        />

        <DetailSection title="What they reported">
          <SubjectRow
            label={ticket.type === "complain" ? "Complaining about" : "Need reparing for"}
            value={ticket.location || "—"}
          />
          <p className="text-sm leading-6 text-body">
            "{ticket.description || "No description was given."}"
          </p>
          {ticket.image ? (
            <TicketPhoto src={ticket.image} displayID={ticket.displayID} />
          ) : null}
        </DetailSection>

        <Timeline steps={buildTimeline(ticket)} />

        {saveError ? (
          <p role="alert" className="text-sm text-destructive">
            {saveError}
          </p>
        ) : null}
      </div>

      {advanceLabel ? (
        <SheetFooter className="border-t border-hairline sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="dark"
            disabled={isSaving}
            onClick={() => void advance()}
          >
            {isSaving ? <Spinner /> : null}
            {advanceLabel}
          </Button>
        </SheetFooter>
      ) : null}
    </>
  );
}

/**
 * Label and value sit together here rather than at opposite edges: both are
 * short, and the sheet is wide enough that a ledger row reads as two unrelated
 * things.
 */
function SubjectRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </p>
  );
}

function buildTimeline(ticket: AdminTicket): TimelineStep[] {
  return [
    {
      label: "Raised",
      value: formatDate(ticket.createDate, true),
      reached: true,
    },
    {
      label: "Work started",
      value:
        ticket.status === "need_action" ? "Not yet" : "Owner took it on",
      reached: ticket.status !== "need_action",
    },
    {
      label: "Done",
      value: ticket.resolveDate
        ? formatDate(ticket.resolveDate, true)
        : "Not yet",
      reached: ticket.status === "done",
    },
  ];
}

/** The stored path can point at a file that is no longer on disk. */
function TicketPhoto({ src, displayID }: { src: string; displayID: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex h-28 w-full items-center justify-center rounded-md border border-hairline bg-page text-sm text-muted-foreground">
        Photo unavailable
      </div>
    );
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      title="Open the full-size photo"
      className="block overflow-hidden rounded-md border border-hairline"
    >
      <img
        src={src}
        alt={`Photo attached to ticket ${displayID}`}
        className="max-h-52 w-full object-cover"
        onError={() => setHasError(true)}
      />
    </a>
  );
}

export { TicketDetailsSheet };
