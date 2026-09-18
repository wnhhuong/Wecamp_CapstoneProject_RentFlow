import { useState } from "react";
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
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/router/routes";
import { submitExtendRequest } from "@/shared/api/user/requests.api";
import type { TenantContract } from "@/shared/types/contract";
import type { TenantExtendRequest } from "@/shared/types/request";
import { formatDate, formatYears } from "@/shared/utils/dateFormatter";

interface ExtendLeaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: TenantContract;
  onSubmitted: (request: TenantExtendRequest) => void;
}

function ExtendLeaseDialog({
  open,
  onOpenChange,
  contract,
  onSubmitted,
}: ExtendLeaseDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sentRequest, setSentRequest] = useState<TenantExtendRequest | null>(
    null,
  );

  const years = contract.terms.yearToExtend;

  async function sendRequest() {
    if (isSending) return;

    setIsSending(true);
    setSendError("");

    try {
      const request = await submitExtendRequest();
      setSentRequest(request);
      onSubmitted(request);
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

    if (!next) {
      setSendError("");
      setSentRequest(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[min(30rem,calc(100%-2rem))] max-w-none rounded-lg bg-field p-5 sm:p-6">
        {sentRequest ? (
          <SentState
            request={sentRequest}
            expireDate={contract.expireDate}
            onClose={() => handleOpenChange(false)}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">
                Request lease extension
              </DialogTitle>
              <DialogDescription className="leading-6">
                Ask the owner to extend contract {contract.displayID} by{" "}
                {formatYears(years)}. Your lease keeps its current terms until
                the owner approves.
              </DialogDescription>
            </DialogHeader>

            <dl className="mt-4">
              <Row
                label="Current expiry"
                value={formatDate(contract.expireDate)}
              />
              <Row
                label="New expiry if approved"
                value={formatDate(addYears(contract.expireDate, years))}
              />
            </dl>

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
                {isSending ? <Spinner /> : null}
                {isSending ? "Sending…" : "Send request"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SentState({
  request,
  expireDate,
  onClose,
}: {
  request: TenantExtendRequest;
  expireDate: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">Extension requested</DialogTitle>
        <DialogDescription className="leading-6">
          The owner now sees your request. Your lease still expires on{" "}
          {formatDate(expireDate)} until it is approved.
        </DialogDescription>
      </DialogHeader>

      <dl className="mt-4">
        <Row label="Request ID" value={request.displayID} />
        <Row label="Extension" value={formatYears(request.yearToExtend)} />
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

/**
 * Mirrors the approval step, which adds whole years to the stored expiry. The
 * date only ever previews what approval would do, so it is never persisted.
 */
function addYears(expireDate: string, years: number): string {
  const parts = /^(\d{4})(-\d{2}-\d{2})$/.exec(expireDate);
  if (!parts) return expireDate;

  return `${Number(parts[1]) + years}${parts[2]}`;
}

export { ExtendLeaseDialog };
