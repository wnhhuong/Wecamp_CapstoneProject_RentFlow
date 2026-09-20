import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getTenantPaymentInfo,
  submitPaidRequest,
} from "@/shared/api/user/invoices.api";
import type { TenantPaymentInfo } from "@/shared/types/invoice";
import { formatCurrency } from "@/shared/utils/currencyFormatter";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceID: string;
  displayID: string;
  amount: number;
}

function PaymentDialog({
  open,
  onOpenChange,
  invoiceID,
  displayID,
  amount,
}: PaymentDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [account, setAccount] = useState<TenantPaymentInfo | null>(null);
  const [isQrBroken, setIsQrBroken] = useState(false);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();

    getTenantPaymentInfo(controller.signal)
      .then((info) => {
        setAccount(info);
        setIsQrBroken(false);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [open]);

  async function notifyOwner() {
    if (isSending) return;

    setIsSending(true);
    setSendError("");

    try {
      await submitPaidRequest(invoiceID);
      onOpenChange(false);
    } catch (error: unknown) {
      setSendError(
        error instanceof Error
          ? error.message
          : "The payment notice could not be sent.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleOpenChange(next: boolean) {
    // Closing mid-send would hide whether the notice went through.
    if (isSending) return;

    if (!next) setSendError("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[min(34rem,calc(100%-2rem))] max-w-none rounded-lg bg-field p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">Pay this invoice</DialogTitle>
          <DialogDescription className="leading-5">
            Scan the code or transfer manually. Keep the transfer note so the
            owner can match your payment.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row">
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-lg border border-hairline bg-white p-3">
              {account?.bankQrImage && !isQrBroken ? (
                <img
                  src={account.bankQrImage}
                  alt="Bank transfer QR code"
                  className="size-36 object-contain"
                  onError={() => setIsQrBroken(true)}
                />
              ) : (
                <QrPlaceholder value={displayID} />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {account?.bankQrImage && !isQrBroken
                ? "Scan to pay"
                : "Transfer manually"}
            </p>
          </div>

          <dl className="flex-1 space-y-3 text-sm">
            <PaymentRow label="Amount" value={formatCurrency(amount)} strong />
            <PaymentRow label="Transfer note" value={displayID} strong />
            <PaymentRow
              label="Account holder"
              value={account?.bankAccountHolder ?? "—"}
            />
            <PaymentRow label="Bank" value={account?.bankName ?? "—"} />
            <PaymentRow
              label="Account number"
              value={account?.bankAccountNumber ?? "—"}
            />
          </dl>
        </div>

        <p className="mt-5 border-l-2 border-brand pl-3 text-sm leading-6 text-body">
          Tell the owner once the transfer is done. This invoice stays unpaid
          until they confirm receiving the money.
        </p>

        {sendError ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {sendError}
          </p>
        ) : null}

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            disabled={isSending}
            onClick={() => handleOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            disabled={isSending}
            onClick={() => void notifyOwner()}
          >
            {isSending ? "Sending…" : "I have transferred"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-2 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          strong ? "font-semibold text-foreground" : "text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Decorative only — deliberately not a scannable code. The demo never settles a
 * real transfer, so the tenant reads the account rows beside it and types the
 * note. Swapping this for a real VietQR needs the bank's 6-digit Napas BIN,
 * which `bankName` does not carry.
 */
function QrPlaceholder({ value }: { value: string }) {
  const size = 21;
  const cells: boolean[] = [];

  let seed = 7;
  for (const character of value) {
    seed = (seed * 31 + character.charCodeAt(0)) % 100000;
  }

  for (let index = 0; index < size * size; index += 1) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    cells.push(seed % 100 < 46);
  }

  const isFinder = (row: number, column: number) => {
    const inBox = (startRow: number, startColumn: number) =>
      row >= startRow &&
      row < startRow + 7 &&
      column >= startColumn &&
      column < startColumn + 7;

    return inBox(0, 0) || inBox(0, size - 7) || inBox(size - 7, 0);
  };

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="size-36 text-ink"
      aria-hidden="true"
    >
      <rect width={size} height={size} fill="white" />
      {cells.map((filled, index) => {
        const row = Math.floor(index / size);
        const column = index % size;
        if (isFinder(row, column) || !filled) return null;

        return (
          <rect
            key={index}
            x={column}
            y={row}
            width={1}
            height={1}
            fill="currentColor"
          />
        );
      })}
      {[
        [0, 0],
        [0, size - 7],
        [size - 7, 0],
      ].map(([row, column]) => (
        <g key={`${row}-${column}`} fill="currentColor">
          <rect x={column} y={row} width={7} height={7} />
          <rect x={column + 1} y={row + 1} width={5} height={5} fill="white" />
          <rect x={column + 2} y={row + 2} width={3} height={3} />
        </g>
      ))}
    </svg>
  );
}

export { PaymentDialog };
