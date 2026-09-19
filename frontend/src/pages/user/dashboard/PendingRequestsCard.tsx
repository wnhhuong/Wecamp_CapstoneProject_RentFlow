import { Link } from "react-router";

import { ROUTES } from "@/router/routes";
import type { DashboardRequest } from "@/shared/types/dashboard";
import { formatDateShort } from "@/shared/utils/dateFormatter";
import { REQUEST_TYPE_LABELS } from "@/shared/utils/requestTypes";

function PendingRequestsCard({ requests }: { requests: DashboardRequest[] }) {
  return (
    <section className="grid min-w-0 gap-3 rounded-xl border border-hairline bg-surface p-5 [&>*]:min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            Pending requests
            {requests.length > 0 ? (
              <span className="rounded-full bg-status-warning-bg px-2 py-0.5 text-xs font-medium tabular-nums text-status-warning-fg">
                {requests.length}
              </span>
            ) : null}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Waiting for the owner to answer
          </p>
        </div>
        <Link
          to={ROUTES.user.requests}
          className="shrink-0 text-sm font-medium whitespace-nowrap text-clay hover:underline"
        >
          View all →
        </Link>
      </div>

      {requests.slice(0, 3).map((request) => (
        <Link
          key={request.requestID}
          to={ROUTES.user.requestDetailsLink(request.requestID)}
          className="flex items-center gap-3 border-b border-hairline py-2.5 last:border-0"
        >
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full bg-status-warning-fg"
          />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-medium text-foreground">
              {REQUEST_TYPE_LABELS[request.type]}
            </strong>
            <span className="block truncate text-xs text-muted-foreground">
              {request.displayID} · {formatDateShort(request.createDate)}
            </span>
          </span>
          <span className="text-xs font-medium text-status-warning-fg">
            PENDING
          </span>
        </Link>
      ))}

      {requests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hairline px-3 py-6 text-center text-sm text-muted-foreground">
          No request is waiting for an answer.
        </div>
      ) : null}
    </section>
  );
}

export { PendingRequestsCard };
