import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { ErrorState, PageLoading } from "@/components/feedback";
import { StatusBadge } from "@/components/status";
import {
  IdentityHeader,
  Timeline,
  type TimelineStep,
} from "@/components/ui/detail-sheet";
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
import { getAdminInvoice } from "@/shared/api/admin/invoices.api";
import type { AdminInvoiceDetail } from "@/shared/types/admin/invoice";
import { formatCurrency } from "@/shared/utils/currencyFormatter";
import { formatBillingPeriod, formatDate } from "@/shared/utils/dateFormatter";

interface ChargeLine {
  label: string;
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
        if (!open) void navigate(ROUTES.admin.invoices);
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
  const [invoice, setInvoice] = useState<AdminInvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    getAdminInvoice(invoiceID, controller.signal)
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
    getAdminInvoice(invoiceID)
      .then(setInvoice)
      .catch(() => setError("This invoice could not be loaded."))
      .finally(() => setIsLoading(false));
  }

  return (
    <>
      <SheetHeader className="border-b border-hairline pr-12">
        <div className="flex flex-wrap items-center gap-2.5">
          <SheetTitle className="text-xl">
            {invoice
              ? `Room ${invoice.roomCode} · ${formatBillingPeriod(invoice.billingPeriod)}`
              : "Invoice"}
          </SheetTitle>
          {invoice ? (
            <StatusBadge domain="invoice" status={invoice.status} />
          ) : null}
        </div>
        <SheetDescription>
          {invoice ? `Invoice ${invoice.displayID}` : "Loading the billing details"}
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
            <IdentityHeader
              className="pt-2"
              name={invoice.tenantName}
              fallbackName="Unknown tenant"
              detail="Tenant"
            />

            {buildAlert(invoice) ? (
              <p
                role="status"
                className={`rounded-md border border-hairline px-3 py-2 text-sm leading-6 ${
                  invoice.isOverdue && invoice.status === "not_paid"
                    ? "bg-status-danger-bg text-status-danger-fg"
                    : "bg-status-info-bg text-status-info-fg"
                }`}
              >
                {buildAlert(invoice)}
              </p>
            ) : null}

            <div
              className="overflow-hidden rounded-lg border border-hairline bg-surface"
            >
              <Table>
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
                      <TableCell className="px-4 font-medium text-foreground">
                        {line.label}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {line.basis}
                      </TableCell>
                      <TableCell className="pr-4 text-right font-medium tabular-nums">
                        {formatCurrency(line.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-muted [&>tr]:border-b-0 [&>tr>td]:py-1">
                  <TableRow className="hover:bg-muted">
                    <TableCell className="px-4 text-foreground">
                      Total amount
                    </TableCell>
                    <TableCell />
                    <TableCell className="pr-4 text-right text-base font-semibold tabular-nums text-foreground">
                      {formatCurrency(invoice.totalBill)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-muted">
                    <TableCell className="px-4">Received</TableCell>
                    <TableCell />
                    <TableCell className="pr-4 text-right text-base font-semibold tabular-nums">
                      {formatCurrency(invoice.received)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-muted">
                    <TableCell className="px-4 text-foreground">
                      Still owed
                    </TableCell>
                    <TableCell />
                    <TableCell
                      className={`pr-4 text-right text-base font-semibold tabular-nums ${
                        invoice.stillOwed > 0
                          ? "text-status-danger-fg"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatCurrency(invoice.stillOwed)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            <Timeline steps={buildTimeline(invoice)} />

            {invoice.unitPriceIsApprox ? (
              <p className="border-l-2 border-brand pl-3 text-sm leading-6 text-body">
                The electricity unit price shown is today's parameter, not the
                one billed: this invoice has no usage to derive it from.
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}

function buildAlert(invoice: AdminInvoiceDetail): string {
  if (invoice.status === "paid") {
    return invoice.isOverdue
      ? `Settled after the due date of ${formatDate(invoice.dueDate)}.`
      : "";
  }

  if (invoice.isOverdue) {
    return invoice.isRequestLate
      ? `Past the due date of ${formatDate(invoice.dueDate)}, but a late payment was approved.`
      : `Past the due date of ${formatDate(invoice.dueDate)} and still not settled.`;
  }

  return invoice.isRequestLate
    ? "A late payment was approved, so the tenant may settle this after the due date."
    : "";
}

function buildChargeLines(invoice: AdminInvoiceDetail): ChargeLine[] {
  const electricityBasis =
    invoice.usageKwh !== null && invoice.unitPrice !== null
      ? `${invoice.usageKwh} kWh × ${formatCurrency(invoice.unitPrice)}`
      : "Metered usage";

  return [
    { label: "Room rent", basis: "Monthly rent", amount: invoice.breakdown.room },
    {
      label: "Electricity",
      basis: electricityBasis,
      amount: invoice.breakdown.electrical,
    },
    { label: "Water", basis: "Monthly service", amount: invoice.breakdown.water },
    { label: "Wifi", basis: "Monthly service", amount: invoice.breakdown.wifi },
    {
      label: "Parking",
      basis: "Monthly service",
      amount: invoice.breakdown.parking,
    },
    { label: "Other", basis: "Adjustments", amount: invoice.breakdown.other },
  ].filter((line) => line.amount > 0 || line.label === "Room rent");
}

function buildTimeline(invoice: AdminInvoiceDetail): TimelineStep[] {
  const isPaid = invoice.status === "paid";

  return [
    {
      label: "Issued",
      value: formatDate(invoice.createDate, true),
      reached: true,
    },
    {
      label: "Due",
      value: formatDate(invoice.dueDate),
      reached: isPaid || invoice.isOverdue,
      isAlert: !isPaid && invoice.isOverdue,
    },
    {
      label: "Paid",
      value: invoice.paymentDate
        ? formatDate(invoice.paymentDate, true)
        : "Not paid yet",
      reached: isPaid,
    },
  ];
}

export { InvoiceDetailsSheet };
