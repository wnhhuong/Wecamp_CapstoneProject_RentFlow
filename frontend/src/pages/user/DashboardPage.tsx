import { useEffect, useState } from "react";

import { ErrorState, PageLoading } from "@/components/feedback";
import { PageContainer } from "@/components/layout";
import { getTenantDashboard } from "@/shared/api/user/dashboard.api";
import { useAuth } from "@/shared/auth/useAuth";
import type { TenantDashboard } from "@/shared/types/dashboard";
import { formatDate } from "@/shared/utils/dateFormatter";

import { ActiveTicketsCard } from "./dashboard/ActiveTicketsCard";
import { ElectricityCard } from "./dashboard/ElectricityCard";
import { InvoiceSummaryCard } from "./dashboard/InvoiceSummaryCard";
import { PendingRequestsCard } from "./dashboard/PendingRequestsCard";

function DashboardPage() {
  const { session } = useAuth();
  const [dashboard, setDashboard] = useState<TenantDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getTenantDashboard(controller.signal)
      .then((loaded) => {
        setDashboard(loaded);
        setLoadError("");
        setIsLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoadError("Your home page could not be loaded.");
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [reloadToken]);

  const firstName = session?.fullName?.trim().split(" ").pop();

  return (
    <PageContainer>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {firstName ? `Welcome back, ${firstName}` : "Home"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your month at a glance · {formatDate(new Date())}
        </p>
      </div>

      {isLoading ? (
        <PageLoading
          title="Loading your home page"
          description="Fetching this month at a glance..."
        />
      ) : null}

      {loadError ? (
        <ErrorState
          description={loadError}
          onRetry={() => {
            setIsLoading(true);
            setReloadToken((token) => token + 1);
          }}
        />
      ) : null}

      {!isLoading && !loadError && dashboard ? (
        <>
          <div className="grid items-stretch gap-4 xl:grid-cols-[2fr_3fr]">
            <ElectricityCard electricity={dashboard.electricity} />
            <InvoiceSummaryCard invoice={dashboard.invoice} />
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-2">
            <PendingRequestsCard requests={dashboard.requests} />
            <ActiveTicketsCard tickets={dashboard.tickets} />
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}

export { DashboardPage };
