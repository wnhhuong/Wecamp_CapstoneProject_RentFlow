import { Link } from "react-router";

import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/router/routes";
import type {
  DashboardInvoice,
  InvoiceBillKey,
} from "@/shared/types/dashboard";
import { formatCurrency } from "@/shared/utils/currencyFormatter";
import {
  formatBillingPeriodShort,
  formatDate,
} from "@/shared/utils/dateFormatter";

const BILL_LINES: { key: InvoiceBillKey; label: string }[] = [
  { key: "room", label: "Rent" },
  { key: "electrical", label: "Electricity" },
  { key: "water", label: "Water" },
  { key: "wifi", label: "Wifi" },
  { key: "parking", label: "Parking" },
  { key: "other", label: "Other" },
];

function InvoiceSummaryCard({ invoice }: { invoice: DashboardInvoice | null }) {
  if (!invoice) {
    return (
      <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-hairline bg-surface p-5">
        <h2 className="font-semibold text-foreground">Current invoice</h2>
        <div className="rounded-lg border border-dashed border-hairline px-3 py-8 text-center text-sm text-muted-foreground">
          No invoice for this month yet. It arrives once the owner approves your
          meter reading.
        </div>
      </section>
    );
  }

  const lines = BILL_LINES.filter((line) => invoice.breakdown[line.key] > 0);

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          Current invoice
          {invoice.billingPeriod
            ? ` · ${formatBillingPeriodShort(invoice.billingPeriod)}`
            : ""}
        </span>
        <StatusBadge domain="invoice" status={invoice.status} />
      </div>

      <div className="flex justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Total this month</p>
          <p className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
            {formatCurrency(invoice.totalBill)}
          </p>
        </div>
        <Button asChild variant="dark" className="mt-auto self-end">
          <Link to={ROUTES.user.invoiceDetailsLink(invoice.invoiceID)}>
            View invoice
          </Link>
        </Button>
      </div>

      <p
        className={
          invoice.isOverdue
            ? "text-sm font-medium text-clay"
            : "text-sm font-medium text-body"
        }
      >
        {invoice.status === "paid" ? "Paid · was due" : "Due"}{" "}
        {formatDate(invoice.dueDate)}
        {invoice.isOverdue ? (
          <span className="rounded-full bg-status-danger-bg px-2 py-1 ml-2 text-xs font-medium text-status-danger-fg">
            Overdue
          </span>
        ) : (
          ""
        )}
      </p>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-flow-col xl:auto-cols-fr mt-3">
        {lines.map((line) => (
          <div key={line.key} className="rounded-lg bg-page px-2.5 py-2">
            <dt className="text-xs text-muted-foreground">{line.label}</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums whitespace-nowrap text-foreground">
              {formatCurrency(invoice.breakdown[line.key])}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export { InvoiceSummaryCard };
