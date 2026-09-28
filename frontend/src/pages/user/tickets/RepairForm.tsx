import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectPopover } from "@/components/ui/select-popover";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  getRepairOptions,
  submitRepairTicket,
} from "@/shared/api/user/tickets.api";
import type { RepairOptions, TenantTicketReceipt } from "@/shared/types/ticket";

import { DESCRIPTION_LIMIT } from "./utils/ticketForm";

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
          <SelectPopover
            id="repair-facility"
            items={
              options
                ? options.facilities.map((facility) => ({
                    value: facility.facilityID,
                    label: facility.label,
                  }))
                : null
            }
            value={facilityID}
            onChange={setFacilityID}
            placeholder="Select an item"
            loadingLabel="Loading your items…"
            emptyLabel="No items are recorded for your room yet."
            invalid={showFacilityProblem}
            disabled={isSending || (options === null && optionsError === "")}
            describedBy="repair-facility-help"
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
            onChange={(event) =>
              selectImage(event.currentTarget.files?.[0] ?? null)
            }
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

export { RepairForm };
