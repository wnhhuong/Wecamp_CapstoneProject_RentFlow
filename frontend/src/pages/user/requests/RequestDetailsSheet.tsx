import { useEffect, useState } from "react";
import { Link } from "react-router";

import { ErrorState, PageLoading } from "@/components/feedback";
import { StatusBadge } from "@/components/status";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ROUTES } from "@/router/routes";
import { getTenantRequest } from "@/shared/api/user/requests.api";
import type {
  TenantRequest,
  TenantRequestDetail,
} from "@/shared/types/request";
import { formatDate } from "@/shared/utils/dateFormatter";
import { REQUEST_TYPE_LABELS } from "@/shared/utils/requestTypes";

interface RequestDetailsSheetProps {
  request: TenantRequest | null;
  onOpenChange: (open: boolean) => void;
}

function RequestDetailsSheet({
  request,
  onOpenChange,
}: RequestDetailsSheetProps) {
  return (
    <Sheet open={request !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {request ? (
          <RequestDetailsLoader key={request.requestID} request={request} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function RequestDetailsLoader({ request }: { request: TenantRequest }) {
  const [detail, setDetail] = useState<TenantRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    getTenantRequest(request.requestID)
      .then((requestDetail) => {
        if (isActive) setDetail(requestDetail);
      })
      .catch(() => {
        if (isActive) setError("This request could not be loaded.");
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
    getTenantRequest(request.requestID)
      .then(setDetail)
      .catch(() => setError("This request could not be loaded."))
      .finally(() => setIsLoading(false));
  }

  return (
    <>
      <SheetHeader className="border-b border-hairline pr-12">
        <SheetTitle className="text-xl">{request.displayID}</SheetTitle>
        <SheetDescription>
          {REQUEST_TYPE_LABELS[request.type]} · sent{" "}
          {formatDate(request.createDate)}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 px-4 pb-4">
        {isLoading ? (
          <PageLoading
            title="Loading request"
            description="Fetching what you sent the owner..."
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
              <DetailRow label="Room">{detail.roomCode}</DetailRow>
              <DetailRow label="Sent">
                {formatDate(detail.createDate, true)}
              </DetailRow>
              <DetailRow label="Answered">
                {detail.resolveDate
                  ? formatDate(detail.resolveDate, true)
                  : "Not yet"}
              </DetailRow>
            </section>

            {detail.invoice ? (
              <Section
                title="Invoice"
                action={
                  <Link
                    to={ROUTES.user.invoiceDetailsLink(
                      detail.invoice.invoiceID,
                    )}
                    className="text-sm font-medium underline underline-offset-2"
                  >
                    View details
                  </Link>
                }
              >
                <DetailRow label="Invoice ID">
                  {detail.invoice.displayID}
                </DetailRow>
              </Section>
            ) : null}

            {detail.contract ? (
              <Section title="Contract">
                <DetailRow label="Contract ID">
                  {detail.contract.displayID}
                </DetailRow>
                {detail.contract.requestedMoveoutDate ? (
                  <DetailRow label="Requested move-out">
                    {formatDate(detail.contract.requestedMoveoutDate)}
                  </DetailRow>
                ) : null}
              </Section>
            ) : null}

            {detail.consumption ? (
              <Section title="Meter reading">
                <MeterImage
                  src={detail.consumption.meterImage}
                  displayID={detail.displayID}
                />
                <DetailRow label="Reading">
                  {detail.consumption.reading} kWh
                </DetailRow>
                <DetailRow label="Captured">
                  {formatDate(detail.consumption.capturedAt, true)}
                </DetailRow>
              </Section>
            ) : null}

            {detail.checkout ? (
              <Section title="Checkout reading">
                <MeterImage
                  src={detail.checkout.meterImage}
                  displayID={detail.displayID}
                />
                <DetailRow label="Final reading">
                  {detail.checkout.finalReading} kWh
                </DetailRow>
              </Section>
            ) : null}

            {detail.status === "pending" ? (
              <p className="border-l-2 border-clay pl-3 text-sm leading-6 text-body">
                The owner has not answered this request yet.
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 border-t border-hairline pt-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  );
}

/** The stored path can point at a file that is no longer on disk. */
function MeterImage({ src, displayID }: { src: string; displayID: string }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-md border border-hairline bg-page text-sm text-muted-foreground">
        Photo unavailable
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Photo sent with request ${displayID}`}
      className="aspect-[4/3] w-full rounded-md border border-hairline object-cover"
      onError={() => setHasError(true)}
    />
  );
}

export { RequestDetailsSheet };
