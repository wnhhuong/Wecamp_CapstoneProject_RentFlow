import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";

import { ErrorState, PageLoading } from "@/components/feedback";
import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/router/routes";
import {
  approveAdminRequest,
  getAdminRequest,
} from "@/shared/api/admin/requests.api";
import type {
  AdminInvoiceDetails,
  AdminRequest,
  AdminRequestDetail,
} from "@/shared/types/admin/request";
import type { RequestType } from "@/shared/types/request";
import { formatCurrency } from "@/shared/utils/currencyFormatter";
import { formatDate } from "@/shared/utils/dateFormatter";
import { REQUEST_TYPE_LABELS } from "@/shared/utils/requestTypes";

const APPROVE_LABELS: Partial<Record<RequestType, string>> = {
  consump: "Approve and create invoice",
  paid: "Confirm payment",
  delay: "Approve late payment",
};

const APPROVE_NOTES: Partial<Record<RequestType, string>> = {
  consump:
    "Approving records the consumption and creates an invoice immediately.",
  paid: "Approving marks the invoice PAID. Confirm only after the money has arrived.",
  delay:
    "Approving acknowledges that the tenant will pay after the due date. The invoice status remains NOT PAID and the due date stays the same.",
};

interface RequestDetailsSheetProps {
  request: AdminRequest | null;
  onOpenChange: (open: boolean) => void;
  onApproved: () => void;
}

function RequestDetailsSheet({
  request,
  onOpenChange,
  onApproved,
}: RequestDetailsSheetProps) {
  return (
    <Sheet open={request !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {request ? (
          <RequestDetailsLoader
            key={request.requestID}
            request={request}
            onApproved={onApproved}
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
          <SheetTitle className="text-xl">{request.displayID}</SheetTitle>
          {detail ? (
            <StatusBadge domain="request" status={detail.status} />
          ) : null}
        </div>
        <SheetDescription>
          {REQUEST_TYPE_LABELS[request.type]} · Room {request.roomCode}
        </SheetDescription>
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
            <section className="grid gap-3 py-2">
              <DetailRow label="Tenant" value={detail.tenantName} />
              <DetailRow
                label="Submitted"
                value={formatDate(detail.createDate, true)}
              />
              <DetailRow
                label="Resolved"
                value={
                  detail.resolveDate
                    ? formatDate(detail.resolveDate, true)
                    : "Not yet"
                }
              />
            </section>

            {detail.consumption ? (
              <ConsumptionSection
                roomCode={detail.roomCode}
                consumption={detail.consumption}
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
            ) : APPROVE_NOTES[detail.type] ? (
              <p className="rounded-md border border-hairline bg-status-info-bg px-3 py-2 text-sm leading-6 text-status-info-fg">
                {APPROVE_NOTES[detail.type]}
              </p>
            ) : (
              <p className="border-l-2 border-clay pl-3 text-sm leading-6 text-body">
                Approving {REQUEST_TYPE_LABELS[detail.type].toLowerCase()}{" "}
                requests is not available yet.
              </p>
            )}

            {approveError ? (
              <p role="alert" className="text-sm text-destructive">
                {approveError}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      {detail && (detail.invoice || canApprove) ? (
        <SheetFooter className="border-t border-hairline sm:flex-row sm:justify-end">
          {detail.invoice ? (
            <Button type="button" variant="outline" asChild>
              <Link to={ROUTES.admin.invoiceDetailsLink(detail.invoice.invoiceID)}>
                View invoice
              </Link>
            </Button>
          ) : null}

          {canApprove ? (
            <Button
              type="button"
              variant="dark"
              disabled={isApproving}
              onClick={() => void approve()}
            >
              {isApproving ? <Spinner /> : null}
              {approveLabel}
            </Button>
          ) : null}
        </SheetFooter>
      ) : null}
    </>
  );
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
      <MeterImage src={consumption.meterImage} roomCode={roomCode} />
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
function MeterImage({ src, roomCode }: { src: string; roomCode: string }) {
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
        alt={`Meter reading submitted for room ${roomCode}`}
        className="max-h-52 w-full object-cover"
        onError={() => setHasError(true)}
      />
    </a>
  );
}

function DetailSection({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3 border-t border-hairline pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {badge}
      </div>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

export { RequestDetailsSheet };
