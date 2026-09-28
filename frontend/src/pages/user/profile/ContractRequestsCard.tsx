import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { TenantContract } from "@/shared/types/contract";
import type {
  TenantCheckoutReceipt,
  TenantExtendReceipt,
  TenantMoveoutReceipt,
  TenantRequest,
} from "@/shared/types/request";
import { formatDate, formatYears } from "@/shared/utils/dateFormatter";

import { CheckoutRequestDialog } from "./CheckoutRequestDialog";
import { ExtendLeaseDialog } from "./ExtendLeaseDialog";
import { MoveoutRequestDialog } from "./MoveoutRequestDialog";
import {
  getEarliestMoveoutDate,
  MOVEOUT_NOTICE_LABEL,
} from "./utils/moveoutWindow";

interface ContractRequestsCardProps {
  contract: TenantContract;
  pendingExtension: TenantRequest | null;
  moveoutRequest: TenantRequest | null;
  checkoutRequest: TenantRequest | null;
  onExtensionRequested: (request: TenantExtendReceipt) => void;
  onMoveoutRequested: (request: TenantMoveoutReceipt) => void;
  onCheckoutRequested: (request: TenantCheckoutReceipt) => void;
}

function ContractRequestsCard({
  contract,
  pendingExtension,
  moveoutRequest,
  checkoutRequest,
  onExtensionRequested,
  onMoveoutRequested,
  onCheckoutRequested,
}: ContractRequestsCardProps) {
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isMoveoutOpen, setIsMoveoutOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const isContractActive = contract.status === "active";
  const years = contract.terms.yearToExtend;

  const earliestMoveoutDate = getEarliestMoveoutDate();
  const hasMoveoutWindow = earliestMoveoutDate <= contract.expireDate;

  // The backend refuses a checkout until a move-out notice has been approved.
  const canRequestCheckout =
    isContractActive &&
    moveoutRequest?.status === "approved" &&
    checkoutRequest === null;

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
            moveoutRequest,
            hasMoveoutWindow,
            earliestMoveoutDate,
            expireDate: contract.expireDate,
          })}
          action={
            <Button
              type="button"
              disabled={
                !isContractActive ||
                !hasMoveoutWindow ||
                moveoutRequest !== null
              }
              onClick={() => setIsMoveoutOpen(true)}
            >
              Request Move-out
            </Button>
          }
        />

        <ActionRow
          title="Final checkout"
          description={checkoutDescription({
            checkoutRequest,
            moveoutRequest,
            roomCode: contract.roomCode,
          })}
          action={
            <Button
              type="button"
              disabled={!canRequestCheckout}
              onClick={() => setIsCheckoutOpen(true)}
            >
              Submit checkout
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

      {canRequestCheckout || isCheckoutOpen ? (
        <CheckoutRequestDialog
          open={isCheckoutOpen}
          onOpenChange={setIsCheckoutOpen}
          contract={contract}
          onSubmitted={onCheckoutRequested}
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

function checkoutDescription({
  checkoutRequest,
  moveoutRequest,
  roomCode,
}: {
  checkoutRequest: TenantRequest | null;
  moveoutRequest: TenantRequest | null;
  roomCode: string;
}): string {
  if (checkoutRequest) {
    return checkoutRequest.status === "approved"
      ? `Checkout ${checkoutRequest.displayID} is approved. Your lease has ended.`
      : `Checkout ${checkoutRequest.displayID} is awaiting the owner's review.`;
  }

  if (moveoutRequest?.status !== "approved") {
    return "Available once the owner approves your move-out notice.";
  }

  return `Send the final meter reading and a photo to close room ${roomCode}.`;
}

function moveoutDescription({
  moveoutRequest,
  hasMoveoutWindow,
  earliestMoveoutDate,
  expireDate,
}: {
  moveoutRequest: TenantRequest | null;
  hasMoveoutWindow: boolean;
  earliestMoveoutDate: string;
  expireDate: string;
}): string {
  if (moveoutRequest) {
    return moveoutRequest.status === "approved"
      ? `Notice ${moveoutRequest.displayID} is approved. Your checkout comes next.`
      : `Notice ${moveoutRequest.displayID} is awaiting the owner's review.`;
  }

  if (!hasMoveoutWindow) {
    return `Your lease ends on ${formatDate(expireDate)}, sooner than the ${MOVEOUT_NOTICE_LABEL} notice needs. Speak to the owner directly.`;
  }

  return `Tell the owner you are leaving, any date from ${formatDate(earliestMoveoutDate)} to ${formatDate(expireDate)}.`;
}

export { ContractRequestsCard };
