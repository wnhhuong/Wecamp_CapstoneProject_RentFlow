import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { TenantContract } from "@/shared/types/contract";
import type {
  TenantExtendRequest,
  TenantMoveoutRequest,
  TenantRequest,
} from "@/shared/types/request";
import { formatDate, formatYears } from "@/shared/utils/dateFormatter";

import { ExtendLeaseDialog } from "./ExtendLeaseDialog";
import { MoveoutRequestDialog } from "./MoveoutRequestDialog";
import {
  getEarliestMoveoutDate,
  MOVEOUT_NOTICE_DAYS,
} from "./utils/moveoutWindow";

interface ContractRequestsCardProps {
  contract: TenantContract;
  pendingExtension: TenantRequest | null;
  pendingMoveout: TenantRequest | null;
  onExtensionRequested: (request: TenantExtendRequest) => void;
  onMoveoutRequested: (request: TenantMoveoutRequest) => void;
}

function ContractRequestsCard({
  contract,
  pendingExtension,
  pendingMoveout,
  onExtensionRequested,
  onMoveoutRequested,
}: ContractRequestsCardProps) {
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isMoveoutOpen, setIsMoveoutOpen] = useState(false);
  const isContractActive = contract.status === "active";
  const years = contract.terms.yearToExtend;

  const earliestMoveoutDate = getEarliestMoveoutDate();
  const hasMoveoutWindow = earliestMoveoutDate <= contract.expireDate;

  return (
    <section className="rounded-lg border border-hairline bg-surface p-5">
      <h2 className="text-lg font-semibold text-foreground">
        Contract requests
      </h2>

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
              disabled={!isContractActive || pendingExtension !== null}
              onClick={() => setIsExtendOpen(true)}
            >
              Request extension
            </Button>
          }
        />

        <ActionRow
          title="Move-out notice"
          description={moveoutDescription({
            pendingMoveout,
            hasMoveoutWindow,
            earliestMoveoutDate,
            expireDate: contract.expireDate,
          })}
          action={
            <Button
              type="button"
              disabled={
                !isContractActive || !hasMoveoutWindow || pendingMoveout !== null
              }
              onClick={() => setIsMoveoutOpen(true)}
            >
              Request Move-out
            </Button>
          }
        />
      </div>

      {isContractActive ? (
        <ExtendLeaseDialog
          open={isExtendOpen}
          onOpenChange={setIsExtendOpen}
          contract={contract}
          onSubmitted={onExtensionRequested}
        />
      ) : null}

      {isContractActive && hasMoveoutWindow ? (
        <MoveoutRequestDialog
          open={isMoveoutOpen}
          onOpenChange={setIsMoveoutOpen}
          contract={contract}
          onSubmitted={onMoveoutRequested}
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

function moveoutDescription({
  pendingMoveout,
  hasMoveoutWindow,
  earliestMoveoutDate,
  expireDate,
}: {
  pendingMoveout: TenantRequest | null;
  hasMoveoutWindow: boolean;
  earliestMoveoutDate: string;
  expireDate: string;
}): string {
  if (pendingMoveout) {
    return `Notice ${pendingMoveout.displayID} is awaiting the owner's review.`;
  }

  if (!hasMoveoutWindow) {
    return `Your lease ends on ${formatDate(expireDate)}, sooner than the ${MOVEOUT_NOTICE_DAYS} days' notice needs. Speak to the owner directly.`;
  }

  return `Tell the owner you are leaving, any date from ${formatDate(earliestMoveoutDate)} to ${formatDate(expireDate)}.`;
}

export { ContractRequestsCard };
