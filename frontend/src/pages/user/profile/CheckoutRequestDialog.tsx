import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/router/routes";
import { getLatestMeterReading } from "@/shared/api/user/invoices.api";
import { submitCheckoutRequest } from "@/shared/api/user/requests.api";
import type { TenantContract } from "@/shared/types/contract";
import type { TenantCheckoutReceipt } from "@/shared/types/request";

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface CheckoutRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: TenantContract;
  onSubmitted: (request: TenantCheckoutReceipt) => void;
}

function CheckoutRequestDialog({
  open,
  onOpenChange,
  contract,
  onSubmitted,
}: CheckoutRequestDialogProps) {
  const [lastReading, setLastReading] = useState<number | null>(null);
  const [finalImage, setFinalImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [finalReading, setFinalReading] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sentRequest, setSentRequest] = useState<TenantCheckoutReceipt | null>(
    null,
  );
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    getLatestMeterReading(controller.signal)
      .then((reading) => setLastReading(reading))
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  const readingNumber = Number(finalReading);
  const isReadingValid =
    finalReading.trim() !== "" &&
    Number.isInteger(readingNumber) &&
    readingNumber >= (lastReading ?? 0);

  const showReadingProblem =
    (finalReading.trim() !== "" && !isReadingValid) ||
    (hasTriedSubmit && finalReading.trim() === "");
  const showImageProblem = hasTriedSubmit && finalImage === null;

  function selectImage(file: File | null) {
    if (!file) {
      setFinalImage(null);
      setImageError("");
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFinalImage(null);
      setImageError("Use a JPG, PNG or WEBP photo.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setFinalImage(null);
      setImageError("The photo must be 5 MB or smaller.");
      return;
    }

    setFinalImage(file);
    setImageError("");
  }

  async function sendRequest() {
    if (isSending) return;

    setHasTriedSubmit(true);
    if (!finalImage || !isReadingValid) return;

    setIsSending(true);
    setSendError("");

    try {
      const request = await submitCheckoutRequest({
        finalImage,
        finalReading: readingNumber,
      });
      setSentRequest(request);
      onSubmitted(request);
    } catch (error: unknown) {
      setSendError(
        error instanceof Error
          ? error.message
          : "The checkout could not be sent.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleOpenChange(next: boolean) {
    // Closing mid-send would hide whether the checkout went through.
    if (isSending) return;

    if (!next) {
      setFinalImage(null);
      setImageError("");
      setFinalReading("");
      setHasTriedSubmit(false);
      setSendError("");
      setSentRequest(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[min(30rem,calc(100%-2rem))] max-h-[85vh] max-w-none overflow-y-auto rounded-lg bg-field p-5 sm:p-6">
        {sentRequest ? (
          <SentState
            request={sentRequest}
            onClose={() => handleOpenChange(false)}
          />
        ) : (
          <form
            aria-busy={isSending}
            onSubmit={(event) => {
              event.preventDefault();
              void sendRequest();
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-xl">Submit your checkout</DialogTitle>
              <DialogDescription className="leading-6">
                Send the owner the final electricity reading for room{" "}
                {contract.roomCode} and a photo of the meter. This closes the
                lease once the owner approves.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-4">
              <MeterPhotoField
                file={finalImage}
                error={imageError}
                missing={showImageProblem}
                disabled={isSending}
                onSelect={selectImage}
              />

              <div className="space-y-1.5">
                <Label htmlFor="final-reading">Final meter reading</Label>
                <Input
                  id="final-reading"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  placeholder="0"
                  value={finalReading}
                  disabled={isSending}
                  aria-describedby="final-reading-help"
                  onChange={(event) => setFinalReading(event.target.value)}
                />
                <p
                  id="final-reading-help"
                  className={
                    showReadingProblem
                      ? "text-sm text-destructive"
                      : "text-sm text-muted-foreground"
                  }
                >
                  {lastReading === null
                    ? "Enter the full meter reading as a whole number."
                    : `This reading cannot be lower than your previous reading (${lastReading} kWh).`}
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
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? <Spinner /> : null}
                {isSending ? "Sending…" : "Send checkout"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MeterPhotoField({
  file,
  error,
  missing,
  disabled,
  onSelect,
}: {
  file: File | null;
  error: string;
  missing: boolean;
  disabled: boolean;
  onSelect: (file: File | null) => void;
}) {
  const problem = error || (missing ? "Attach a photo of the meter." : "");

  return (
    <div className="space-y-1.5">
      <Label htmlFor="final-image">Photo of the meter</Label>
      <Input
        id="final-image"
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        disabled={disabled}
        aria-describedby="final-image-help"
        className="file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
        onChange={(event) => onSelect(event.currentTarget.files?.[0] ?? null)}
      />
      <p
        id="final-image-help"
        className={
          problem ? "text-sm text-destructive" : "text-sm text-muted-foreground"
        }
      >
        {problem || (file ? file.name : "JPG, PNG or WEBP, up to 5 MB.")}
      </p>
    </div>
  );
}

function SentState({
  request,
  onClose,
}: {
  request: TenantCheckoutReceipt;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">Checkout sent</DialogTitle>
        <DialogDescription className="leading-6">
          The owner reviews your final reading. Your lease ends once they
          approve it.
        </DialogDescription>
      </DialogHeader>

      <dl className="mt-4">
        <Row label="Request ID" value={request.displayID} />
        <Row
          label="Final reading"
          value={`${request.finalReading} kWh`}
        />
        <div className="flex items-start justify-between gap-4 border-b border-hairline py-2.5 text-sm last:border-b-0">
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <StatusBadge domain="request" status={request.status} />
          </dd>
        </div>
      </dl>

      <DialogFooter className="mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onClose();
            void navigate(ROUTES.user.requestDetailsLink(request.requestID));
          }}
        >
          View request
        </Button>
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

export { CheckoutRequestDialog };
