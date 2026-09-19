import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SelectPopover } from "@/components/ui/select-popover";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  getComplaintOptions,
  submitComplaintTicket,
} from "@/shared/api/user/tickets.api";
import type {
  ComplaintOptions,
  TenantTicketReceipt,
} from "@/shared/types/ticket";

import { DESCRIPTION_LIMIT } from "./utils/ticketForm";

const WHOLE_AREA = "";

function ComplaintForm({
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
  const [options, setOptions] = useState<ComplaintOptions | null>(null);
  const [optionsError, setOptionsError] = useState("");
  const [areaID, setAreaID] = useState("");
  const [roomID, setRoomID] = useState(WHOLE_AREA);
  const [description, setDescription] = useState("");
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    getComplaintOptions(controller.signal)
      .then((loaded) => setOptions(loaded))
      .catch(() => {
        if (!controller.signal.aborted) {
          setOptionsError("The places you can report could not be loaded.");
        }
      });

    return () => controller.abort();
  }, []);

  const selectedArea = options?.areas.find((area) => area.areaID === areaID);
  const showAreaProblem = hasTriedSubmit && areaID === "";
  const showDescriptionProblem = hasTriedSubmit && description.trim() === "";

  function selectArea(nextAreaID: string) {
    setAreaID(nextAreaID);
    // The rooms on offer change with the area, so a held room no longer fits.
    setRoomID(WHOLE_AREA);
  }

  async function send() {
    if (isSending) return;

    setHasTriedSubmit(true);
    if (areaID === "" || description.trim() === "") return;

    onSendingChange(true);
    setSendError("");

    try {
      onSent(
        await submitComplaintTicket({
          areaID,
          roomID,
          description: description.trim(),
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
        <DialogTitle className="text-xl">Raise a complaint</DialogTitle>
        <DialogDescription className="leading-6">
          Tell the owner what is bothering you around the building. They see it
          as soon as you send it.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="complaint-area">Where it happens</Label>
          <SelectPopover
            id="complaint-area"
            items={
              options
                ? options.areas.map((area) => ({
                    value: area.areaID,
                    label: area.areaName,
                  }))
                : null
            }
            value={areaID}
            onChange={selectArea}
            placeholder="Select a building"
            loadingLabel="Loading places…"
            emptyLabel="No buildings are set up yet."
            invalid={showAreaProblem}
            disabled={isSending || (options === null && optionsError === "")}
            describedBy="complaint-area-help"
          />
          <p
            id="complaint-area-help"
            className={
              optionsError || showAreaProblem
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {optionsError ||
              (showAreaProblem
                ? "Pick the building this is about."
                : "Start with the building, then narrow it down if you can.")}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="complaint-room">Room involved</Label>
          <SelectPopover
            id="complaint-room"
            items={[
              { value: WHOLE_AREA, label: "Anywhere in this area" },
              ...(selectedArea?.rooms ?? []).map((room) => ({
                value: room.roomID,
                label: room.roomCode,
              })),
            ]}
            value={roomID}
            onChange={setRoomID}
            placeholder="Anywhere in this area"
            disabled={isSending || !selectedArea}
            describedBy="complaint-room-help"
          />
          <p id="complaint-room-help" className="text-sm text-muted-foreground">
            {selectedArea
              ? "Optional. Leave it as it is when no single room is involved."
              : "Pick a building first to see its rooms."}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="complaint-description">What happened</Label>
          <Textarea
            id="complaint-description"
            rows={4}
            maxLength={DESCRIPTION_LIMIT}
            placeholder="Loud music from the hallway after 23:00."
            value={description}
            disabled={isSending}
            aria-invalid={showDescriptionProblem}
            aria-describedby="complaint-description-help"
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="flex items-start justify-between gap-3">
            <p
              id="complaint-description-help"
              className={
                showDescriptionProblem
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              {showDescriptionProblem
                ? "Describe what is bothering you."
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

export { ComplaintForm };
