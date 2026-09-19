import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { ErrorState, PageLoading } from "@/components/feedback";
import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import {
  DetailRow,
  DetailSection,
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
import { ROUTES } from "@/router/routes";
import { getTenantRequest } from "@/shared/api/user/requests.api";
import type { TenantRequestDetail } from "@/shared/types/request";
import { formatDate } from "@/shared/utils/dateFormatter";
import { REQUEST_TYPE_LABELS } from "@/shared/utils/requestTypes";

function RequestDetailsSheet() {
  const { requestId = "" } = useParams();
  const navigate = useNavigate();

  return (
    <Sheet
      open={requestId !== ""}
      onOpenChange={(open) => {
        if (!open) void navigate(ROUTES.user.requests);
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {requestId ? (
          <RequestDetailsLoader key={requestId} requestID={requestId} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function RequestDetailsLoader({ requestID }: { requestID: string }) {
  const [detail, setDetail] = useState<TenantRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    getTenantRequest(requestID)
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
  }, [requestID]);

  function retry() {
    setIsLoading(true);
    setError("");
    getTenantRequest(requestID)
      .then(setDetail)
      .catch(() => setError("This request could not be loaded."))
      .finally(() => setIsLoading(false));
  }

  // The header already draws a line, so whichever section comes first must not
  // draw another one under it.
  const firstSection = detail
    ? ([
        detail.consumption && "consumption",
        detail.checkout && "checkout",
        detail.contract && "contract",
        detail.invoice && "invoice",
      ].find(Boolean) as string | undefined)
    : undefined;

  return (
    <>
      <SheetHeader className="border-b border-hairline pr-12">
        <div className="flex flex-wrap items-center gap-2.5">
          <SheetTitle className="text-xl">
            {detail ? REQUEST_TYPE_LABELS[detail.type] : "Request"}
          </SheetTitle>
          {detail ? (
            <StatusBadge domain="request" status={detail.status} />
          ) : null}
        </div>
        <SheetDescription>
          {detail ? detail.displayID : "Loading what you sent the owner"}
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
            {detail.consumption ? (
              <DetailSection title="Meter reading" bordered={false}>
                <DetailRow
                  label="Reading"
                  value={`${detail.consumption.reading} kWh`}
                />
                <DetailRow
                  label="Captured"
                  value={formatDate(detail.consumption.capturedAt, true)}
                />
                <MeterImage
                  src={detail.consumption.meterImage}
                  displayID={detail.displayID}
                />
              </DetailSection>
            ) : null}

            {detail.checkout ? (
              <DetailSection
                title="Checkout reading"
                bordered={firstSection !== "checkout"}
              >
                <DetailRow
                  label="Final reading"
                  value={`${detail.checkout.finalReading} kWh`}
                />
                <MeterImage
                  src={detail.checkout.meterImage}
                  displayID={detail.displayID}
                />
              </DetailSection>
            ) : null}

            {detail.contract ? (
              <DetailSection bordered={firstSection !== "contract"} title="Contract">
                <DetailRow
                  label="Contract ID"
                  value={detail.contract.displayID}
                />
                {detail.contract.requestedMoveoutDate ? (
                  <DetailRow
                    label="Requested move-out"
                    value={formatDate(detail.contract.requestedMoveoutDate)}
                  />
                ) : null}
              </DetailSection>
            ) : null}

            {detail.invoice ? (
              <DetailSection bordered={firstSection !== "invoice"} title="Invoice">
                <DetailRow
                  label="Invoice ID"
                  value={detail.invoice.displayID}
                />
              </DetailSection>
            ) : null}

            {detail.status === "pending" ? (
              <p
                role="status"
                className="rounded-md border border-hairline bg-status-info-bg px-3 py-2 text-sm leading-6 text-status-info-fg"
              >
                The owner has not answered this request yet.
              </p>
            ) : null}

            <Timeline steps={buildTimeline(detail)} />
          </>
        ) : null}
      </div>

      {detail?.invoice ? (
        <SheetFooter className="border-t border-hairline sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" asChild>
            <Link
              to={ROUTES.user.invoiceDetailsLink(detail.invoice.invoiceID)}
            >
              View invoice
            </Link>
          </Button>
        </SheetFooter>
      ) : null}
    </>
  );
}

function buildTimeline(detail: TenantRequestDetail): TimelineStep[] {
  return [
    {
      label: "Sent",
      value: formatDate(detail.createDate, true),
      reached: true,
    },
    {
      label: "Answered",
      value: detail.resolveDate
        ? formatDate(detail.resolveDate, true)
        : "Not yet",
      reached: detail.status === "approved",
    },
  ];
}

/** The stored path can point at a file that is no longer on disk. */
function MeterImage({ src, displayID }: { src: string; displayID: string }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="flex h-28 w-full items-center justify-center rounded-md border border-hairline bg-page text-sm text-muted-foreground">
        Photo unavailable
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
        alt={`Photo sent with request ${displayID}`}
        className="max-h-52 w-full object-cover"
        onError={() => setHasError(true)}
      />
    </a>
  );
}

export { RequestDetailsSheet };
