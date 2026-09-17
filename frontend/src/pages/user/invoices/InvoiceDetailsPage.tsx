import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import { ErrorState, PageLoading } from "@/components/feedback";
import { PageContainer } from "@/components/layout";
import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
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
import { formatDate } from "@/shared/utils/dateFormatter";

import { LatePaymentDialog } from "./LatePaymentDialog";
import { PaymentDialog } from "./PaymentDialog";

interface ChargeLine {
  label: string;
  note: string;
  basis: string;
  amount: number;
}

function InvoiceDetailsPage() {
  const { invoiceId = "" } = useParams();
  const [invoice, setInvoice] = useState<TenantInvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isLatePaymentOpen, setIsLatePaymentOpen] = useState(false);

  async function loadInvoice() {
    setIsLoading(true);
    setLoadError("");

    try {
      setInvoice(await getTenantInvoice(invoiceId));
    } catch {
      setLoadError("This invoice could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    getTenantInvoice(invoiceId, controller.signal)
      .then((loadedInvoice) => setInvoice(loadedInvoice))
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadError("This invoice could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [invoiceId]);

  const isUnpaid = invoice?.status === "not_paid";

  return (
    <PageContainer>
      <Link
        to={ROUTES.user.invoices}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span aria-hidden="true">←</span>
        Back to invoices
      </Link>

      {isLoading ? (
        <PageLoading
          title="Loading invoice"
          description="Fetching the billing details..."
        />
      ) : null}

      {loadError ? (
        <ErrorState
          description={loadError}
          onRetry={() => void loadInvoice()}
        />
      ) : null}

      {!isLoading && !loadError && invoice ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-foreground">
                  {invoice.displayID}
                </h1>
                <StatusBadge domain="invoice" status={invoice.status} />
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Room {invoice.roomCode} · issued{" "}
                {formatDate(invoice.createDate, true)} · due{" "}
                {formatDate(invoice.dueDate)}
                {invoice.paymentDate
                  ? ` · paid ${formatDate(invoice.paymentDate, true)}`
                  : ""}
              </p>
            </div>

            {isUnpaid ? (
              <div className="flex flex-wrap items-center gap-2">
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
              </div>
            ) : null}
          </div>

          {invoice.isOverdue ? (
            <p
              role="status"
              className="rounded-md border border-[#e5b9ad] bg-status-danger-bg px-3 py-2.5 text-sm leading-5 text-status-danger-fg"
            >
              This invoice passed its due date on {formatDate(invoice.dueDate)}.
              Please settle it or contact the owner.
            </p>
          ) : null}

          {invoice.isRequestLate ? (
            <p
              role="status"
              className="border-l-2 border-clay pl-3 text-sm leading-6 text-body"
            >
              A late payment request was sent for this invoice. The invoice
              stays unpaid until the owner confirms your payment.
            </p>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
            <Table className="min-w-[560px]">
              <TableHeader className="bg-muted">
                <TableRow className="hover:bg-muted">
                  <TableHead className="px-4">Description</TableHead>
                  <TableHead>Quantity / basis</TableHead>
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
                        {line.note}
                      </span>
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {line.basis}
                    </TableCell>
                    <TableCell className="pr-4 text-right align-top font-medium">
                      {formatCurrency(line.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>

              <TableFooter className="bg-muted">
                <TableRow className="hover:bg-muted">
                  <TableCell className="px-4 text-base font-semibold text-foreground">
                    Total amount
                  </TableCell>
                  <TableCell />
                  <TableCell className="pr-4 text-right text-xl font-semibold text-foreground">
                    {formatCurrency(invoice.totalBill)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <PaymentDialog
            open={isPaymentOpen}
            onOpenChange={setIsPaymentOpen}
            displayID={invoice.displayID}
            amount={invoice.totalBill}
          />

          <LatePaymentDialog
            open={isLatePaymentOpen}
            onOpenChange={setIsLatePaymentOpen}
            dueDate={invoice.dueDate}
          />
        </>
      ) : null}
    </PageContainer>
  );
}

function buildChargeLines(invoice: TenantInvoiceDetail): ChargeLine[] {
  const lines: ChargeLine[] = [
    {
      label: `Monthly rent — Room ${invoice.roomCode}`,
      note: "Fixed in the contract",
      basis: "Monthly charge",
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
      note: "Parking service for this billing month",
      basis: "Monthly charge",
      amount: invoice.breakdown.parking,
    },
  ];

  if (invoice.breakdown.other > 0) {
    lines.push({
      label: "Other charges",
      note: "Added by the owner for this period",
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

export { InvoiceDetailsPage };
