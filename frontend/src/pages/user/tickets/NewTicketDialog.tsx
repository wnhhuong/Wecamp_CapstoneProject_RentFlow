import { useState } from "react";

import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TenantTicketReceipt } from "@/shared/types/ticket";

import { ComplaintForm } from "./ComplaintForm";
import { RepairForm } from "./RepairForm";

type TicketKind = "repair" | "complain";

interface NewTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function NewTicketDialog({
  open,
  onOpenChange,
  onCreated,
}: NewTicketDialogProps) {
  const [kind, setKind] = useState<TicketKind | null>(null);
  const [receipt, setReceipt] = useState<TenantTicketReceipt | null>(null);
  const [isSending, setIsSending] = useState(false);

  function handleOpenChange(next: boolean) {
    // Closing mid-send would hide whether the ticket went through.
    if (isSending) return;

    if (!next) {
      setKind(null);
      setReceipt(null);
    }
    onOpenChange(next);
  }

  function handleSent(sent: TenantTicketReceipt) {
    setReceipt(sent);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[min(30rem,calc(100%-2rem))] max-h-[85vh] max-w-none overflow-y-auto rounded-lg bg-field p-5 sm:p-6">
        {receipt ? (
          <SentState
            receipt={receipt}
            onClose={() => handleOpenChange(false)}
          />
        ) : kind === "repair" ? (
          <RepairForm
            isSending={isSending}
            onSendingChange={setIsSending}
            onBack={() => setKind(null)}
            onSent={handleSent}
          />
        ) : kind === "complain" ? (
          <ComplaintForm
            isSending={isSending}
            onSendingChange={setIsSending}
            onBack={() => setKind(null)}
            onSent={handleSent}
          />
        ) : (
          <TypeStep onPick={setKind} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TypeStep({ onPick }: { onPick: (kind: TicketKind) => void }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">New ticket</DialogTitle>
        <DialogDescription className="leading-6">
          What would you like to report to the owner about?
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <TypeCard
          kind="repair"
          title="Something in your room is broken"
          hint="Pick the item, describe the fault and attach a photo."
          onPick={onPick}
        />
        <TypeCard
          kind="complain"
          title="Something outside your room bothers you"
          hint="Say where it happens and what is going on."
          onPick={onPick}
        />
      </div>
    </>
  );
}

function TypeCard({
  kind,
  title,
  hint,
  onPick,
}: {
  kind: TicketKind;
  title: string;
  hint: string;
  onPick: (kind: TicketKind) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(kind)}
      className="w-full rounded-lg border border-hairline bg-surface p-4 text-left transition-colors hover:border-clay hover:bg-muted"
    >
      <span className="flex items-center gap-2.5">
        <StatusBadge domain="ticketType" status={kind} />
        <span className="font-medium text-foreground">{title}</span>
      </span>
      <span className="mt-1.5 block text-sm text-muted-foreground">{hint}</span>
    </button>
  );
}

function SentState({
  receipt,
  onClose,
}: {
  receipt: TenantTicketReceipt;
  onClose: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">
          {receipt.type === "complain" ? "Complaint sent" : "Repair reported"}
        </DialogTitle>
        <DialogDescription className="leading-6">
          The owner picks this up from here. Follow it in your ticket list.
        </DialogDescription>
      </DialogHeader>

      <dl className="mt-4">
        <Row label="Ticket ID" value={receipt.displayID} />
        <Row label="What you reported" value={receipt.description} />
        <div className="flex items-start justify-between gap-4 border-b border-hairline py-2.5 text-sm last:border-b-0">
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <StatusBadge domain="ticket" status={receipt.status} />
          </dd>
        </div>
      </dl>

      <DialogFooter className="mt-6">
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-hairline py-2.5 text-sm last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

export { NewTicketDialog };
