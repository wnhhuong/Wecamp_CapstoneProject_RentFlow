import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
import { Link } from "react-router";

import { ErrorState, PageLoading } from "@/components/feedback";
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
import {
  DetailRow,
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
import type { RequestsOutletContext } from "@/pages/admin/outlet-context";
import { ROUTES } from "@/router/routes";
import {
  approveAdminRequest,
  getAdminRequest,
} from "@/shared/api/admin/requests.api";
import type {
  AdminCheckoutDetails,
  AdminExtensionDetails,
  AdminInvoiceDetails,
  AdminMoveoutDetails,
  AdminRequest,
  AdminRequestDetail,
} from "@/shared/types/admin/request";
import type { RequestType } from "@/shared/types/request";
import { formatCurrency } from "@/shared/utils/currencyFormatter";
import {
  addYears,
  formatDate,
  formatYears,
} from "@/shared/utils/dateFormatter";
import { REQUEST_TYPE_LABELS } from "@/shared/utils/requestTypes";

const APPROVE_LABELS: Partial<Record<RequestType, string>> = {
  consump: "Approve and create invoice",
  paid: "Confirm payment",
  delay: "Approve late payment",
  extend: "Approve extension",
  moveout: "Approve move-out",
  checkout: "Approve checkout",
};

const APPROVE_NOTES: Partial<Record<RequestType, string>> = {
  consump:
    "Approving records the consumption and creates an invoice immediately.",
  paid: "Approving marks the invoice PAID. Confirm only after the money has arrived.",
  delay:
    "Approving acknowledges that the tenant will pay after the due date. The invoice status remains NOT PAID and the due date stays the same.",
  extend:
    "Approving moves the contract expiry date forward. Nothing else on the lease changes, and the rent stays at the signed price.",
  moveout:
    "Approving marks the room available soon and lets the tenant submit their checkout. The lease stays active until that checkout is approved.",
  checkout:
    "Approving closes the lease for good: the room goes back on the market as available now, and the tenant loses access to their account. This cannot be undone.",
};

function RequestDetailsSheet() {
  const { requestId = "" } = useParams();
  const navigate = useNavigate();
  const { requests, onApproved } = useOutletContext<RequestsOutletContext>();
  const request = requests.find(item => item.requestID === requestId) ?? null;

  return (
    <Sheet
      open={request !== null}
      onOpenChange={open => {
        if (!open) void navigate(ROUTES.admin.requests);
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {request ? (
          <RequestDetailsLoader
            key={request.requestID}
            request={request}
            onApproved={() => onApproved(request.requestID)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function RequestDetailsLoader({
  request,
  onApproved,
}: {
  request: AdminRequest;
  onApproved: () => void;
}) {
  const [detail, setDetail] = useState<AdminRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    getAdminRequest(request.requestID)
      .then((requestDetail) => {
        if (isActive) setDetail(requestDetail);
      })
      .catch(() => {
        if (isActive) setError("The request details could not be loaded.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [request.requestID]);

  function retry() {
    setIsLoading(true);
    setError("");
    getAdminRequest(request.requestID)
      .then(setDetail)
      .catch(() => setError("The request details could not be loaded."))
      .finally(() => setIsLoading(false));
  }

  async function approve() {
    if (!detail || isApproving) return;

    setIsApproving(true);
    setApproveError("");

    try {
      const result = await approveAdminRequest(detail.requestID);
      // Re-read instead of patching locally: approving also settles or creates the invoice.
      setDetail(
        await getAdminRequest(detail.requestID).catch(() => ({
          ...detail,
          status: result.status,
          resolveDate: result.resolveDate,
        })),
      );
      onApproved();
      setIsConfirmOpen(false);
    } catch (approvalError: unknown) {
      setApproveError(
        approvalError instanceof Error
          ? approvalError.message
          : "The request could not be approved.",
      );
    } finally {
      setIsApproving(false);
    }
  }

  const approveLabel = detail ? APPROVE_LABELS[detail.type] : undefined;
  const canApprove = Boolean(approveLabel) && detail?.status === "pending";
  // The outcome outlives the click: an approved request keeps showing what it did.
  const outcome =
    detail && detail.status === "approved" ? buildOutcome(detail) : null;

  return (
    <>
      <SheetHeader className="border-b border-hairline pr-12">
        <div className="flex flex-wrap items-center gap-2.5">
          <SheetTitle className="text-xl">
            {REQUEST_TYPE_LABELS[request.type]}
          </SheetTitle>
          {detail ? (
            <StatusBadge domain="request" status={detail.status} />
          ) : null}
        </div>
        <SheetDescription>{request.displayID}</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 px-4 pb-4">
        {isLoading ? (
          <PageLoading
            title="Loading request"
            description="Fetching what the tenant submitted..."
          />
        ) : null}

        {error ? <ErrorState description={error} onRetry={retry} /> : null}

        {!isLoading && !error && detail ? (
          <>
            <IdentityHeader
              title=""
              name={detail.tenantName}
              fallbackName="Unknown tenant"
              detail={`Room ${detail.roomCode}`}
              bordered={false}
            />

            {detail.consumption ? (
              <ConsumptionSection
                roomCode={detail.roomCode}
                consumption={detail.consumption}
              />
            ) : null}

            {detail.extension ? (
              <ExtensionSection
                extension={detail.extension}
                isPending={detail.status === "pending"}
              />
            ) : null}

            {detail.moveout ? <MoveoutSection moveout={detail.moveout} /> : null}

            {detail.checkout ? (
              <CheckoutSection
                roomCode={detail.roomCode}
                checkout={detail.checkout}
              />
            ) : null}

            {/* A consumption approval creates the invoice, so it is an outcome to
                open from the footer, not evidence the owner reviews here. */}
            {detail.invoice && detail.type !== "consump" ? (
              <InvoiceSection invoice={detail.invoice} />
            ) : null}

            {outcome ? (
              <p
                role="status"
                className="rounded-md border border-hairline bg-status-success-bg px-3 py-2 text-sm leading-6 text-status-success-fg"
              >
                {outcome}
              </p>
            ) : null}

            {!outcome && !approveLabel ? (
              <p className="border-l-2 border-clay pl-3 text-sm leading-6 text-body">
                Approving {REQUEST_TYPE_LABELS[detail.type].toLowerCase()}{" "}
                requests is not available yet.
              </p>
            ) : null}

            <Timeline steps={buildTimeline(detail)} />
          </>
        ) : null}
      </div>

      {detail &&
      (detail.invoice ||
        detail.extension ||
        detail.moveout ||
        detail.checkout ||
        canApprove) ? (
        <SheetFooter className="border-t border-hairline sm:flex-row sm:justify-end">
          {detail.invoice ? (
            <Button type="button" variant="outline" asChild>
              <Link to={ROUTES.admin.invoiceDetailsLink(detail.invoice.invoiceID)}>
                View invoice
              </Link>
            </Button>
          ) : null}

          {(detail.extension || detail.moveout || detail.checkout) &&
          detail.roomID ? (
            <Button type="button" variant="outline" asChild>
              <Link to={ROUTES.admin.roomDetailsLink(detail.roomID)}>
                View room & lease
              </Link>
            </Button>
          ) : null}

          {canApprove ? (
            <Button
              type="button"
              variant="dark"
              onClick={() => {
                setApproveError("");
                setIsConfirmOpen(true);
              }}
            >
              {approveLabel}
            </Button>
          ) : null}
        </SheetFooter>
      ) : null}

      {detail && approveLabel ? (
        <ApproveConfirmDialog
          open={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          label={approveLabel}
          note={APPROVE_NOTES[detail.type] ?? ""}
          displayID={detail.displayID}
          isApproving={isApproving}
          error={approveError}
          onConfirm={() => void approve()}
        />
      ) : null}
    </>
  );
}

function ApproveConfirmDialog({
  open,
  onOpenChange,
  label,
  note,
  displayID,
  isApproving,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  note: string;
  displayID: string;
  isApproving: boolean;
  error: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isApproving) onOpenChange(next);
      }}
    >
      {/* Sits above the sheet it is opened from, whose overlay is already z-50. */}
      <DialogContent className="z-[60] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{label}?</DialogTitle>
          <DialogDescription>{note}</DialogDescription>
        </DialogHeader>

        <p className="text-sm text-body">Request {displayID}</p>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isApproving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="dark"
            disabled={isApproving}
            onClick={onConfirm}
          >
            {isApproving ? <Spinner /> : null}
            {isApproving ? "Approving\u2026" : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildTimeline(detail: AdminRequestDetail): TimelineStep[] {
  return [
    {
      label: "Submitted",
      value: formatDate(detail.createDate, true),
      reached: true,
    },
    {
      label: "Resolved",
      value: detail.resolveDate
        ? formatDate(detail.resolveDate, true)
        : "Not yet",
      reached: detail.status === "approved",
    },
  ];
}

function buildOutcome(detail: AdminRequestDetail) {
  const invoiceLabel = detail.invoice
    ? `Invoice ${detail.invoice.invoiceDisplayID}`
    : "The invoice";

  if (detail.type === "paid") {
    return `Payment confirmed. ${invoiceLabel} is now marked PAID.`;
  }

  if (detail.type === "delay") {
    return detail.invoice
      ? `Late payment approved. ${invoiceLabel} remains NOT PAID and is still due ${formatDate(detail.invoice.dueDate)}.`
      : `Late payment approved. ${invoiceLabel} remains NOT PAID.`;
  }

  if (detail.type === "consump") {
    return `Reading approved. An invoice was created for room ${detail.roomCode}.`;
  }

  if (detail.type === "moveout") {
    return `Move-out approved. Room ${detail.roomCode} is now available soon, and the tenant can submit their checkout.`;
  }

  if (detail.type === "checkout") {
    return `Checkout approved. The lease is closed, room ${detail.roomCode} is available now, and the tenant can no longer sign in.`;
  }

  if (detail.type === "extend") {
    // The re-read detail already carries the moved expiry date.
    return detail.extension
      ? `Extension approved. The lease now runs to ${formatDate(detail.extension.expireDate)}.`
      : "Extension approved. The contract expiry date has moved.";
  }

  return `${detail.displayID} was approved.`;
}

function ConsumptionSection({
  roomCode,
  consumption,
}: {
  roomCode: string;
  consumption: NonNullable<AdminRequestDetail["consumption"]>;
}) {
  return (
    <DetailSection title={`Meter reading · ${consumption.billingPeriod}`}>
      <MeterImage
        src={consumption.meterImage}
        alt={`Meter reading submitted for room ${roomCode}`}
      />
      <DetailRow
        label="Previous reading"
        value={`${consumption.previousReading} kWh`}
      />
      <DetailRow
        label="Current reading"
        value={`${consumption.currentReading} kWh`}
      />
      <DetailRow label="Usage" value={`${consumption.usage} kWh`} />
      <DetailRow
        label="Captured"
        value={formatDate(consumption.capturedAt, true)}
      />
    </DetailSection>
  );
}

function ExtensionSection({
  extension,
  isPending,
}: {
  extension: AdminExtensionDetails;
  isPending: boolean;
}) {
  return (
    <DetailSection title="Contract">
      <DetailRow label="Contract ID" value={extension.contractDisplayID} />
      <DetailRow
        label={isPending ? "Current expiry" : "Expiry date"}
        value={
          extension.expireDate ? formatDate(extension.expireDate) : "Not set"
        }
      />
      <DetailRow label="Extension" value={formatYears(extension.yearToExtend)} />
      {isPending ? (
        <DetailRow
          label="New expiry if approved"
          value={
            extension.expireDate
              ? formatDate(addYears(extension.expireDate, extension.yearToExtend))
              : "Not set"
          }
        />
      ) : null}
    </DetailSection>
  );
}

function CheckoutSection({
  roomCode,
  checkout,
}: {
  roomCode: string;
  checkout: AdminCheckoutDetails;
}) {
  return (
    <>
      <DetailSection title="Final meter reading">
        <MeterImage
          src={checkout.meterImage}
          alt={`Final meter reading submitted for room ${roomCode}`}
        />
        <DetailRow
          label="Last recorded reading"
          value={`${checkout.previousReading} kWh`}
        />
        <DetailRow label="Final reading" value={`${checkout.finalReading} kWh`} />
        <DetailRow label="Usage" value={`${checkout.usage} kWh`} />
      </DetailSection>

      <DetailSection title="Contract">
        <DetailRow label="Contract ID" value={checkout.contractDisplayID} />
        <DetailRow
          label="Lease expiry"
          value={checkout.expireDate ? formatDate(checkout.expireDate) : "Not set"}
        />
      </DetailSection>
    </>
  );
}

function MoveoutSection({ moveout }: { moveout: AdminMoveoutDetails }) {
  return (
    <DetailSection title="Contract">
      <DetailRow label="Contract ID" value={moveout.contractDisplayID} />
      <DetailRow
        label="Planned move-out"
        value={
          moveout.requestMoveoutDate
            ? formatDate(moveout.requestMoveoutDate)
            : "Not set"
        }
      />
    </DetailSection>
  );
}

function InvoiceSection({ invoice }: { invoice: AdminInvoiceDetails }) {
  return (
    <DetailSection
      title="Invoice"
      badge={<StatusBadge domain="invoice" status={invoice.invoiceStatus} />}
    >
      <DetailRow label="Invoice ID" value={invoice.invoiceDisplayID} />
      <DetailRow label="Amount" value={formatCurrency(invoice.totalBill)} />
      <DetailRow
        label="Due date"
        value={invoice.dueDate ? formatDate(invoice.dueDate) : "Not set"}
      />
    </DetailSection>
  );
}

/** The stored path can point at a file that is no longer on disk. */
function MeterImage({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="flex h-28 w-full items-center justify-center rounded-md border border-hairline bg-page text-sm text-muted-foreground">
        Meter image unavailable
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
        alt={alt}
        className="max-h-52 w-full object-cover"
        onError={() => setHasError(true)}
      />
    </a>
  );
}

export { RequestDetailsSheet };
