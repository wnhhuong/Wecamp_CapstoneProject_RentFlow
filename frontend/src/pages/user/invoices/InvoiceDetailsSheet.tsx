import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { ErrorState, PageLoading } from "@/components/feedback";
import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/router/routes";
import { getTenantInvoice } from "@/shared/api/user/invoices.api";
import type { TenantInvoiceDetail } from "@/shared/types/invoice";
import { formatCurrency } from "@/shared/utils/currencyFormatter";
import { formatBillingPeriod, formatDate } from "@/shared/utils/dateFormatter";

import { LatePaymentDialog } from "./LatePaymentDialog";
import { PaymentDialog } from "./PaymentDialog";

interface ChargeLine {
  label: string;
  note: string;
  basis: string;
  amount: number;
}

function InvoiceDetailsSheet() {
  const { invoiceId = "" } = useParams();
  const navigate = useNavigate();

  return (
    <Sheet
      open={invoiceId !== ""}
      onOpenChange={(open) => {
        if (!open) void navigate(ROUTES.user.invoices);
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {invoiceId ? (
          <InvoiceDetailsLoader key={invoiceId} invoiceID={invoiceId} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function InvoiceDetailsLoader({ invoiceID }: { invoiceID: string }) {
  const [invoice, setInvoice] = useState<TenantInvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isLatePaymentOpen, setIsLatePaymentOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    getTenantInvoice(invoiceID, controller.signal)
      .then(setInvoice)
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("This invoice could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [invoiceID]);

  function retry() {
    setIsLoading(true);
    setError("");
    getTenantInvoice(invoiceID)
      .then(setInvoice)
      .catch(() => setError("This invoice could not be loaded."))
      .finally(() => setIsLoading(false));
  }

  const isUnpaid = invoice?.status === "not_paid";

  return (
    <>
      <SheetHeader className="border-b border-hairline pr-12">
        <div className="flex flex-wrap items-center gap-2.5">
          <SheetTitle className="text-xl">
            {invoice
              ? `Room ${invoice.roomCode} · ${formatBillingPeriod(invoice.billingMonth ?? "")}`
              : "Invoice"}
          </SheetTitle>
          {invoice ? (
            <StatusBadge domain="invoice" status={invoice.status} />
          ) : null}
        </div>
        <SheetDescription>
          {invoice
            ? `Invoice ${invoice.displayID}`
            : "Loading the billing details"}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 px-4 pb-4">
        {isLoading ? (
          <PageLoading
            title="Loading invoice"
            description="Fetching the billing details..."
          />
        ) : null}

        {error ? <ErrorState description={error} onRetry={retry} /> : null}

        {!isLoading && !error && invoice ? (
          <>
            <dl className="grid gap-3 pt-4">
              <SummaryRow
                label="Issued"
                value={formatDate(invoice.createDate, true)}
              />
              <SummaryRow label="Due" value={formatDate(invoice.dueDate)} />
              {invoice.paymentDate ? (
                <SummaryRow
                  label="Paid"
                  value={formatDate(invoice.paymentDate, true)}
                />
              ) : null}
            </dl>

            {invoice.isOverdue ? (
              <p
                role="status"
                className="rounded-md border border-hairline bg-status-danger-bg px-3 py-2 text-sm leading-6 text-status-danger-fg"
              >
                This invoice passed its due date on{" "}
                {formatDate(invoice.dueDate)}. Please settle it or contact the
                owner.
              </p>
            ) : null}

            {invoice.isRequestLate ? (
              <p
                role="status"
                className="rounded-md border border-hairline bg-status-info-bg px-3 py-2 text-sm leading-6 text-status-info-fg"
              >
                A late payment request was sent for this invoice. It stays
                unpaid until the owner confirms your payment.
              </p>
            ) : null}

            <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
              <Table className="min-w-[440px]">
                <TableHeader className="bg-muted">
                  <TableRow className="hover:bg-muted">
                    <TableHead className="px-4">Description</TableHead>
                    <TableHead className="pr-4 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {buildChargeLines(invoice).map((line) => (
                    <TableRow key={line.label} className="hover:bg-transparent">
                      <TableCell className="px-4 align-top">
                        <span className="block font-medium text-foreground">
                          {line.label}
                        </span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">
                          {line.basis}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4 text-right align-top font-medium">
                        {formatCurrency(line.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>

                <TableFooter className="bg-muted">
                  <TableRow className="hover:bg-muted">
                    <TableCell className="px-4 font-semibold text-foreground">
                      Total amount
                    </TableCell>
                    <TableCell className="pr-4 text-right text-lg font-semibold text-foreground">
                      {formatCurrency(invoice.totalBill)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            <PaymentDialog
              open={isPaymentOpen}
              onOpenChange={setIsPaymentOpen}
              invoiceID={invoiceID}
              displayID={invoice.displayID}
              amount={invoice.totalBill}
            />

            <LatePaymentDialog
              open={isLatePaymentOpen}
              onOpenChange={setIsLatePaymentOpen}
              invoiceID={invoiceID}
              dueDate={invoice.dueDate}
            />
          </>
        ) : null}
      </div>

      {invoice && isUnpaid ? (
        <SheetFooter className="border-t border-hairline sm:flex-row sm:justify-end">
          {invoice.isRequestLate ? null : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLatePaymentOpen(true)}
            >
              Request late payment
            </Button>
          )}
          <Button type="button" onClick={() => setIsPaymentOpen(true)}>
            Pay this invoice
          </Button>
        </SheetFooter>
      ) : null}
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function buildChargeLines(invoice: TenantInvoiceDetail): ChargeLine[] {
  const lines: ChargeLine[] = [
    {
      label: `Monthly rent — Room ${invoice.roomCode}`,
      note: "Fixed in the contract",
      basis: "Fixed in the contract",
      amount: invoice.breakdown.room,
    },
    {
      label: "Electricity",
      note: "Meter reading entered by tenant",
      basis: buildElectricityBasis(invoice),
      amount: invoice.breakdown.electrical,
    },
    {
      label: "Water",
      note: "Monthly service",
      basis: "Monthly charge",
      amount: invoice.breakdown.water,
    },
    {
      label: "WiFi",
      note: "Monthly service",
      basis: "Monthly charge",
      amount: invoice.breakdown.wifi,
    },
    {
      label: "Parking",
      note: "Monthly service",
      basis: "Monthly charge",
      amount: invoice.breakdown.parking,
    },
  ];

  if (invoice.breakdown.other > 0) {
    lines.push({
      label: "Other charges",
      note: "Added by the owner",
      basis: "One-off charge",
      amount: invoice.breakdown.other,
    });
  }

  return lines;
}

/**
 * Electricity is billed on the kWh used in the period, not on the cumulative
 * meter number, so the basis reads "142 kWh × ₫ 3.500". The unit price is
 * derived from the invoice, so both fall back to the raw reading when the
 * backend cannot work them out.
 */
function buildElectricityBasis(invoice: TenantInvoiceDetail): string {
  if (invoice.usage === null) {
    return invoice.meterReading === null
      ? "Meter reading"
      : `Meter reading ${invoice.meterReading}`;
  }

  return invoice.unitPrice === null
    ? `${invoice.usage} kWh`
    : `${invoice.usage} kWh × ${formatCurrency(invoice.unitPrice)}`;
}

export { InvoiceDetailsSheet };
