import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { submitLatePaymentRequest } from "@/shared/api/user/invoices.api";
import { formatDate } from "@/shared/utils/dateFormatter";

interface LatePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceID: string;
  dueDate: string;
}

function LatePaymentDialog({
  open,
  onOpenChange,
  invoiceID,
  dueDate,
}: LatePaymentDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");

  async function sendRequest() {
    if (isSending) return;

    setIsSending(true);
    setSendError("");

    try {
      await submitLatePaymentRequest(invoiceID);
      onOpenChange(false);
    } catch (error: unknown) {
      setSendError(
        error instanceof Error
          ? error.message
          : "The request could not be sent.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleOpenChange(next: boolean) {
    // Closing mid-send would hide whether the request went through.
    if (isSending) return;

    if (!next) setSendError("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[min(30rem,calc(100%-2rem))] max-w-none rounded-lg bg-field p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">Request late payment</DialogTitle>
          <DialogDescription className="leading-6">
            Tell the owner you may not be able to pay before{" "}
            {formatDate(dueDate)}. The invoice stays unpaid until the owner
            confirms your payment.
          </DialogDescription>
        </DialogHeader>

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
          <Button
            type="button"
            disabled={isSending}
            onClick={() => void sendRequest()}
          >
            {isSending ? "Sending…" : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { LatePaymentDialog };
