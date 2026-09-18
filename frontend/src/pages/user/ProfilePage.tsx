import { useEffect, useState } from "react";

import { ErrorState, PageLoading } from "@/components/feedback";
import { PageContainer } from "@/components/layout";
import { getTenantContract } from "@/shared/api/user/contract.api";
import { getTenantProfile } from "@/shared/api/user/profile.api";
import { getTenantRequests } from "@/shared/api/user/requests.api";
import type { TenantContract } from "@/shared/types/contract";
import type { TenantProfile } from "@/shared/types/profile";
import type { TenantExtendRequest, TenantRequest } from "@/shared/types/request";

import { ContractRequestsCard } from "./profile/ContractRequestsCard";
import { LeaseCard } from "./profile/LeaseCard";
import { ProfileCard } from "./profile/ProfileCard";

function ProfilePage() {
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [contract, setContract] = useState<TenantContract | null>(null);
  const [pendingExtension, setPendingExtension] = useState<TenantRequest | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function loadProfile() {
    setIsLoading(true);
    setLoadError("");

    try {
      const [loadedProfile, loadedContract, loadedRequests] = await Promise.all([
        getTenantProfile(),
        getTenantContract(),
        loadRequests(),
      ]);
      setProfile(loadedProfile);
      setContract(loadedContract);
      setPendingExtension(findPendingExtension(loadedRequests));
    } catch {
      setLoadError("Your profile could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getTenantProfile(controller.signal),
      getTenantContract(controller.signal),
      loadRequests(controller.signal),
    ])
      .then(([loadedProfile, loadedContract, loadedRequests]) => {
        setProfile(loadedProfile);
        setContract(loadedContract);
        setPendingExtension(findPendingExtension(loadedRequests));
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadError("Your profile could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <PageContainer>
      <div>
        <h1 className="text-3xl font-semibold text-foreground">
          Profile &amp; lease
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your personal details and the lease you signed
        </p>
      </div>

      {isLoading ? (
        <PageLoading
          title="Loading your profile"
          description="Fetching your personal details..."
        />
      ) : null}

      {loadError ? (
        <ErrorState
          description={loadError}
          onRetry={() => void loadProfile()}
        />
      ) : null}

      {!isLoading && !loadError && profile ? (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <ProfileCard profile={profile} onSaved={setProfile} />

            {contract ? (
              <ContractRequestsCard
                contract={contract}
                pendingExtension={pendingExtension}
                onExtensionRequested={(request) =>
                  setPendingExtension(toPendingExtension(request))
                }
              />
            ) : null}
          </div>

          {contract ? (
            <LeaseCard contract={contract} profile={profile} />
          ) : (
            <p className="border-l-2 border-clay pl-3 text-sm leading-6 text-body">
              No active lease is recorded for your room right now.
            </p>
          )}
        </div>
      ) : null}
    </PageContainer>
  );
}

/**
 * A failed request list only costs the pending notice, so it must not take the
 * lease down with it; the backend still rejects a duplicate extension.
 */
function loadRequests(signal?: AbortSignal): Promise<TenantRequest[]> {
  return getTenantRequests(signal).catch(() => []);
}

function findPendingExtension(requests: TenantRequest[]): TenantRequest | null {
  return (
    requests.find(
      (request) => request.type === "extend" && request.status === "pending",
    ) ?? null
  );
}

function toPendingExtension(request: TenantExtendRequest): TenantRequest {
  return {
    requestID: request.requestID,
    displayID: request.displayID,
    type: "extend",
    createDate: request.createDate,
    resolveDate: null,
    status: request.status,
  };
}

export { ProfilePage };
