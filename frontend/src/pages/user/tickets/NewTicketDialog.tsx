import { Popover } from "radix-ui";
import { useEffect, useState } from "react";

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
import { ChevronDownIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  getRepairOptions,
  submitRepairTicket,
} from "@/shared/api/user/tickets.api";
import type {
  RepairFacilityOption,
  RepairOptions,
  TenantTicketReceipt,
} from "@/shared/types/ticket";
import { cn } from "@/shared/utils/cn";

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const DESCRIPTION_LIMIT = 200;

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
  const [isRepairChosen, setIsRepairChosen] = useState(false);
  const [receipt, setReceipt] = useState<TenantTicketReceipt | null>(null);
  const [isSending, setIsSending] = useState(false);

  function handleOpenChange(next: boolean) {
    // Closing mid-send would hide whether the ticket went through.
    if (isSending) return;

    if (!next) {
      setIsRepairChosen(false);
      setReceipt(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[min(30rem,calc(100%-2rem))] max-h-[85vh] max-w-none overflow-y-auto rounded-lg bg-field p-5 sm:p-6">
        {receipt ? (
          <SentState
            receipt={receipt}
            onClose={() => handleOpenChange(false)}
          />
        ) : isRepairChosen ? (
          <RepairForm
            isSending={isSending}
            onSendingChange={setIsSending}
            onBack={() => setIsRepairChosen(false)}
            onSent={(sent) => {
              setReceipt(sent);
              onCreated();
            }}
          />
        ) : (
          <TypeStep onPickRepair={() => setIsRepairChosen(true)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TypeStep({ onPickRepair }: { onPickRepair: () => void }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">New ticket</DialogTitle>
        <DialogDescription className="leading-6">
          What would you like to report to the owner about?
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onPickRepair}
          className="w-full rounded-lg border border-hairline bg-surface p-4 text-left transition-colors hover:border-clay hover:bg-muted"
        >
          <span className="flex items-center gap-2.5">
            <StatusBadge domain="ticketType" status="repair" />
            <span className="font-medium text-foreground">
              Something in your room is broken
            </span>
          </span>
          <span className="mt-1.5 block text-sm text-muted-foreground">
            Pick the item, describe the fault and attach a photo.
          </span>
        </button>

        <div className="w-full rounded-lg border border-hairline bg-surface p-4 opacity-60">
          <span className="flex items-center gap-2.5">
            <StatusBadge domain="ticketType" status="complain" />
            <span className="font-medium text-foreground">
              Something outside your room bothers you
            </span>
          </span>
          <span className="mt-1.5 block text-sm text-muted-foreground">
            Coming soon. Speak to the owner directly for now.
          </span>
        </div>
      </div>
    </>
  );
}

function RepairForm({
  isSending,
  onSendingChange,
  onBack,
  onSent,
}: {
  isSending: boolean;
  onSendingChange: (sending: boolean) => void;
  onBack: () => void;
  onSent: (receipt: TenantTicketReceipt) => void;
}) {
  const [options, setOptions] = useState<RepairOptions | null>(null);
  const [optionsError, setOptionsError] = useState("");
  const [facilityID, setFacilityID] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    getRepairOptions(controller.signal)
      .then((loaded) => setOptions(loaded))
      .catch(() => {
        if (!controller.signal.aborted) {
          setOptionsError("The items in your room could not be loaded.");
        }
      });

    return () => controller.abort();
  }, []);

  const showFacilityProblem = hasTriedSubmit && facilityID === "";
  const showDescriptionProblem = hasTriedSubmit && description.trim() === "";
  const showImageProblem = hasTriedSubmit && image === null;

  function selectImage(file: File | null) {
    if (!file) {
      setImage(null);
      setImageError("");
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImage(null);
      setImageError("Use a JPG, PNG or WEBP photo.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setImage(null);
      setImageError("The photo must be 5 MB or smaller.");
      return;
    }

    setImage(file);
    setImageError("");
  }

  async function send() {
    if (isSending) return;

    setHasTriedSubmit(true);
    if (facilityID === "" || description.trim() === "" || !image) return;

    onSendingChange(true);
    setSendError("");

    try {
      onSent(
        await submitRepairTicket({
          facilityID,
          description: description.trim(),
          image,
        }),
      );
    } catch (error: unknown) {
      setSendError(
        error instanceof Error
          ? error.message
          : "The ticket could not be sent.",
      );
    } finally {
      onSendingChange(false);
    }
  }

  return (
    <form
      aria-busy={isSending}
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <DialogHeader>
        <DialogTitle className="text-xl">Report a repair</DialogTitle>
        <DialogDescription className="leading-6">
          Tell the owner what needs fixing
          {options?.roomCode ? ` in room ${options.roomCode}` : ""}. They see it
          as soon as you send it.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="repair-facility">Item that needs fixing</Label>
          <FacilityPicker
            facilities={options?.facilities ?? null}
            value={facilityID}
            invalid={showFacilityProblem}
            disabled={isSending || (options === null && optionsError === "")}
            onChange={setFacilityID}
          />
          <p
            id="repair-facility-help"
            className={
              optionsError || showFacilityProblem
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {optionsError ||
              (showFacilityProblem
                ? "Pick the item that needs fixing."
                : "Only the items recorded for your room are listed.")}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="repair-description">What is wrong</Label>
          <Textarea
            id="repair-description"
            rows={4}
            maxLength={DESCRIPTION_LIMIT}
            placeholder="The bathroom tap drips even when fully closed."
            value={description}
            disabled={isSending}
            aria-invalid={showDescriptionProblem}
            aria-describedby="repair-description-help"
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="flex items-start justify-between gap-3">
            <p
              id="repair-description-help"
              className={
                showDescriptionProblem
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              {showDescriptionProblem
                ? "Describe the fault so the owner knows what to bring."
                : "Say what happens and since when."}
            </p>
            <span
              aria-hidden="true"
              className="shrink-0 pt-px text-sm tabular-nums text-muted-foreground"
            >
              {description.length}/{DESCRIPTION_LIMIT}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="repair-image">Photo of the item</Label>
          <Input
            id="repair-image"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            disabled={isSending}
            aria-invalid={Boolean(imageError) || showImageProblem}
            aria-describedby="repair-image-help"
            className="file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
            onChange={(event) => selectImage(event.currentTarget.files?.[0] ?? null)}
          />
          <p
            id="repair-image-help"
            className={
              imageError || showImageProblem
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {imageError ||
              (showImageProblem
                ? "Attach a photo of the item."
                : image
                  ? image.name
                  : "JPG, PNG or WEBP, up to 5 MB.")}
          </p>
        </div>
      </div>

      {sendError ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {sendError}
        </p>
      ) : null}

      <DialogFooter className="mt-6">
        <Button
          type="button"
          variant="outline"
          disabled={isSending}
          onClick={onBack}
        >
          Back
        </Button>
        <Button type="submit" disabled={isSending}>
          {isSending ? <Spinner /> : null}
          {isSending ? "Sending…" : "Send ticket"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Single-select list in a popover instead of a native <select>. It has to be a
 * modal popover: the dialog's focus trap swallows clicks otherwise, and it
 * stacks above the dialog, whose own overlay already sits at z-50.
 */
function FacilityPicker({
  facilities,
  value,
  invalid,
  disabled,
  onChange,
}: {
  facilities: RepairFacilityOption[] | null;
  value: string;
  invalid: boolean;
  disabled: boolean;
  onChange: (facilityID: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = facilities?.find(
    (facility) => facility.facilityID === value,
  );

  return (
    <Popover.Root modal open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          id="repair-facility"
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby="repair-facility-help"
          className={cn(
            "group w-full justify-between bg-field font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          {selected
            ? selected.label
            : facilities === null
              ? "Loading your items…"
              : "Select an item"}
          <ChevronDownIcon className="size-4 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className="z-[60] w-[var(--radix-popover-trigger-width)] rounded-lg border border-hairline bg-card py-1.5 shadow-[0_16px_40px_rgba(23,30,38,0.16)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {facilities && facilities.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto py-1">
              {facilities.map((facility) => (
                <li key={facility.facilityID}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-ink/[0.06]",
                      facility.facilityID === value && "font-medium text-clay",
                    )}
                    onClick={() => {
                      onChange(facility.facilityID);
                      setIsOpen(false);
                    }}
                  >
                    {facility.label}
                    {facility.facilityID === value ? (
                      <span
                        aria-hidden="true"
                        className="size-2 shrink-0 rounded-full bg-clay"
                      />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No items are recorded for your room yet.
            </p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
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
        <DialogTitle className="text-xl">Repair reported</DialogTitle>
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
