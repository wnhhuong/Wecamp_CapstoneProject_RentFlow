import { useEffect, useState } from "react";

import { ErrorState, PageLoading } from "@/components/feedback";
import { PageContainer } from "@/components/layout";
import { getTenantContract } from "@/shared/api/user/contract.api";
import { getTenantProfile } from "@/shared/api/user/profile.api";
import { getTenantRequests } from "@/shared/api/user/requests.api";
import type { TenantContract } from "@/shared/types/contract";
import type { TenantProfile } from "@/shared/types/profile";
import type {
  RequestType,
  TenantRequest,
  TenantRequestReceipt,
} from "@/shared/types/request";

import { ContractRequestsCard } from "./profile/ContractRequestsCard";
import { LeaseCard } from "./profile/LeaseCard";
import { ProfileCard } from "./profile/ProfileCard";

function ProfilePage() {
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [contract, setContract] = useState<TenantContract | null>(null);
  const [pendingExtension, setPendingExtension] = useState<TenantRequest | null>(
    null,
  );
  const [pendingMoveout, setPendingMoveout] = useState<TenantRequest | null>(
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
      setPendingExtension(findPending(loadedRequests, "extend"));
      setPendingMoveout(findPending(loadedRequests, "moveout"));
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
        setPendingExtension(findPending(loadedRequests, "extend"));
        setPendingMoveout(findPending(loadedRequests, "moveout"));
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
          <ProfileCard profile={profile} onSaved={setProfile} />

          {contract ? (
            <LeaseCard contract={contract} profile={profile} />
          ) : (
            <p className="border-l-2 border-clay pl-3 text-sm leading-6 text-body">
              No active lease is recorded for your room right now.
            </p>
          )}

          {contract ? (
            <div className="lg:col-span-2">
              <ContractRequestsCard
                contract={contract}
                pendingExtension={pendingExtension}
                pendingMoveout={pendingMoveout}
                onExtensionRequested={(request) =>
                  setPendingExtension(toPendingRequest("extend", request))
                }
                onMoveoutRequested={(request) =>
                  setPendingMoveout(toPendingRequest("moveout", request))
                }
              />
            </div>
          ) : null}
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

function findPending(
  requests: TenantRequest[],
  type: RequestType,
): TenantRequest | null {
  return (
    requests.find(
      (request) => request.type === type && request.status === "pending",
    ) ?? null
  );
}

function toPendingRequest(
  type: RequestType,
  request: TenantRequestReceipt,
): TenantRequest {
  return {
    requestID: request.requestID,
    displayID: request.displayID,
    type,
    createDate: request.createDate,
    resolveDate: null,
    status: request.status,
  };
}

export { ProfilePage };
