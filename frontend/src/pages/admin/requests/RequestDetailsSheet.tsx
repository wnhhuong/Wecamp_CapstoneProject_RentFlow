import { useEffect, useState } from "react";
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
  AdminRequest,
  AdminRequestDetail,
  AdminRequestType,
  ApproveRequestResult,
} from "@/shared/types/admin/request";
import { formatCurrency } from "@/shared/utils/currencyFormatter";
import { formatDate } from "@/shared/utils/dateFormatter";

import { REQUEST_TYPE_LABELS } from "./utils/requestTypes";

const APPROVE_LABELS: Partial<Record<AdminRequestType, string>> = {
  consump: "Approve and create invoice",
  paid: "Confirm payment",
};

const APPROVE_NOTES: Partial<Record<AdminRequestType, string>> = {
  consump:
    "Approval records the consumption and creates a NOT PAID invoice immediately.",
  paid: "Confirm only after the money has arrived. Approving marks the invoice PAID.",
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
  const [approveResult, setApproveResult] =
    useState<ApproveRequestResult | null>(null);

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
      setApproveResult(result);
      // Re-read instead of patching locally: approving also settles the invoice.
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
  const isPending = detail?.status === "pending";
  // The outcome outlives the click: an approved request keeps showing what it did.
  const outcome =
    detail && detail.status === "approved"
      ? buildOutcome(detail, approveResult)
      : null;

  return (
    <>
      <SheetHeader className="border-b border-hairline pr-12">
        <SheetTitle className="text-xl">{request.displayID}</SheetTitle>
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
            <section className="grid gap-3 pt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge domain="request" status={detail.status} />
              </div>
              <DetailRow label="Tenant" value={detail.tenantName} />
              <DetailRow label="Room" value={detail.roomCode} />
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
                detail={detail}
                consumption={detail.consumption}
              />
            ) : null}

            {detail.paid ? <PaidSection paid={detail.paid} /> : null}

            {outcome ? (
              <p
                role="status"
                className="flex gap-2 rounded-md border border-hairline bg-status-success-bg px-3 py-2 text-sm leading-6 text-status-success-fg"
              >
                <span>{outcome}</span>{" "}
                <span>{detail.paid ? (
                  <Link
                    to={ROUTES.admin.invoiceDetailsLink(detail.paid.invoiceID)}
                    className="font-medium underline underline-offset-2"
                  >
                    View invoice
                  </Link>
                ) : null}</span>
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

      {detail && approveLabel ? (
        <SheetFooter className="border-t border-hairline">
          <Button
            type="button"
            variant="dark"
            disabled={!isPending || isApproving}
            onClick={() => void approve()}
          >
            {isApproving ? <Spinner /> : null}
            {isPending ? approveLabel : "Already approved"}
          </Button>
        </SheetFooter>
      ) : null}
    </>
  );
}

function buildOutcome(
  detail: AdminRequestDetail,
  result: ApproveRequestResult | null,
) {
  if (detail.paid) {
    return detail.paid.invoiceStatus === "paid"
      ? `Invoice ${detail.paid.invoiceDisplayID} is marked PAID.`
      : `Invoice ${detail.paid.invoiceDisplayID} was confirmed.`;
  }

  if (detail.type === "consump") {
    return result?.createdInvoiceDueDate
      ? `Reading approved. A NOT PAID invoice was created for room ${detail.roomCode}, due ${formatDate(result.createdInvoiceDueDate)}.`
      : `Reading approved for room ${detail.roomCode}.`;
  }

  return `${detail.displayID} was approved.`;
}

function ConsumptionSection({
  detail,
  consumption,
}: {
  detail: AdminRequestDetail;
  consumption: NonNullable<AdminRequestDetail["consumption"]>;
}) {
  return (
    <section className="grid gap-3 border-t border-hairline pt-4">
      <h3 className="text-sm font-semibold text-foreground">
        Meter reading · {consumption.billingPeriod}
      </h3>

      <MeterImage src={consumption.meterImage} roomCode={detail.roomCode} />

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Previous" value={`${consumption.previousReading} kWh`} />
        <Metric label="Current" value={`${consumption.currentReading} kWh`} />
        <Metric label="Usage" value={`${consumption.usage} kWh`} strong />
      </div>

      <DetailRow
        label="Captured"
        value={formatDate(consumption.capturedAt, true)}
      />
    </section>
  );
}

function PaidSection({
  paid,
}: {
  paid: NonNullable<AdminRequestDetail["paid"]>;
}) {
  return (
    <section className="grid gap-3 border-t border-hairline pt-4">
      <h3 className="text-sm font-semibold text-foreground">Invoice</h3>
      <DetailRow label="Invoice ID" value={paid.invoiceDisplayID} />
      <DetailRow label="Amount" value={formatCurrency(paid.totalBill)} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">Invoice status</span>
        <StatusBadge domain="invoice" status={paid.invoiceStatus} />
      </div>
    </section>
  );
}

/** The stored path can point at a file that is no longer on disk. */
function MeterImage({ src, roomCode }: { src: string; roomCode: string }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-md border border-hairline bg-page text-sm text-muted-foreground">
        Meter image unavailable
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Meter reading submitted for room ${roomCode}`}
      className="aspect-[4/3] w-full rounded-md border border-hairline object-cover"
      onError={() => setHasError(true)}
    />
  );
}

function Metric({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-md border border-hairline bg-page px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-sm font-semibold ${
          strong ? "text-status-success-fg" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

export { RequestDetailsSheet };
