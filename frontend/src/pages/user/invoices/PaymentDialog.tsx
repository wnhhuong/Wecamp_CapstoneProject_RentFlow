import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { submitPaidRequest } from "@/shared/api/user/invoices.api";
import { formatCurrency } from "@/shared/utils/currencyFormatter";

/**
 * Placeholder payment details. Move these to the billing parameters once the
 * owner can configure them from the admin side.
 */
const PAYMENT_ACCOUNT = {
  holder: "NHA TRO BINH AN",
  bank: "Vietcombank (VCB)",
  number: "0071 0009 9999 9",
};

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
              <QrPlaceholder value={displayID} />
            </div>
            <p className="text-sm text-muted-foreground">Scan to pay</p>
          </div>

          <dl className="flex-1 space-y-3 text-sm">
            <PaymentRow label="Amount" value={formatCurrency(amount)} strong />
            <PaymentRow label="Transfer note" value={displayID} strong />
            <PaymentRow label="Account holder" value={PAYMENT_ACCOUNT.holder} />
            <PaymentRow label="Bank" value={PAYMENT_ACCOUNT.bank} />
            <PaymentRow
              label="Account number"
              value={PAYMENT_ACCOUNT.number}
            />
          </dl>
        </div>

        <p className="mt-5 border-l-2 border-clay pl-3 text-sm leading-6 text-body">
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
 * A stand-in for the real payment code: the modules are derived from the
 * invoice id so the block looks stable per invoice. Swap this for a generated
 * VietQR once the owner's bank details live in the billing parameters.
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
      className="size-36"
      role="img"
      aria-label={`Payment code for invoice ${value}`}
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
            fill="#1B2632"
          />
        );
      })}
      {[
        [0, 0],
        [0, size - 7],
        [size - 7, 0],
      ].map(([row, column]) => (
        <g key={`${row}-${column}`} fill="#1B2632">
          <rect x={column} y={row} width={7} height={7} />
          <rect x={column + 1} y={row + 1} width={5} height={5} fill="white" />
          <rect x={column + 2} y={row + 2} width={3} height={3} />
        </g>
      ))}
    </svg>
  );
}

export { PaymentDialog };
