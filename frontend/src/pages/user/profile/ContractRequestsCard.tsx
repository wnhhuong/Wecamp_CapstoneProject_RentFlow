import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { TenantContract } from "@/shared/types/contract";
import type { TenantExtendRequest, TenantRequest } from "@/shared/types/request";

import { ExtendLeaseDialog } from "./ExtendLeaseDialog";

interface ContractRequestsCardProps {
  contract: TenantContract;
  pendingExtension: TenantRequest | null;
  onExtensionRequested: (request: TenantExtendRequest) => void;
}

function ContractRequestsCard({
  contract,
  pendingExtension,
  onExtensionRequested,
}: ContractRequestsCardProps) {
  const [isExtendOpen, setIsExtendOpen] = useState(false);

  // The backend only extends a contract that is still active.
  const canRequestExtension = contract.status === "active";
  const years = contract.terms.yearToExtend;

  return (
    <section className="rounded-lg border border-hairline bg-surface p-5">
      <h2 className="text-lg font-semibold text-foreground">
        Contract requests
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Ask the owner to change the lease itself
      </p>

      <div className="mt-4">
        <ActionRow
          title="Lease extension"
          description={
            pendingExtension
              ? `Request ${pendingExtension.displayID} is awaiting the owner's review.`
              : `Keep room ${contract.roomCode} for another ${formatYears(years)} on the same terms.`
          }
          action={
            <Button
              type="button"
              disabled={!canRequestExtension || pendingExtension !== null}
              onClick={() => setIsExtendOpen(true)}
            >
              Request extension
            </Button>
          }
        />
      </div>

      {canRequestExtension ? (
        <ExtendLeaseDialog
          open={isExtendOpen}
          onOpenChange={setIsExtendOpen}
          contract={contract}
          onSubmitted={onExtensionRequested}
        />
      ) : null}
    </section>
  );
}

function ActionRow({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="min-w-48 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      {action}
    </div>
  );
}

function formatYears(years: number): string {
  return `${years} year${years === 1 ? "" : "s"}`;
}

export { ContractRequestsCard };
