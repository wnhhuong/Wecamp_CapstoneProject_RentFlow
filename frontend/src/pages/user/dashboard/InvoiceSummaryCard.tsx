import { Link } from "react-router";

import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { AppTooltip } from "@/components/ui/tooltip";
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

const BILL_LINES: { key: InvoiceBillKey; label: string; color: string }[] = [
  { key: "room", label: "Rent", color: "bg-chart-1" },
  { key: "electrical", label: "Electricity", color: "bg-chart-2" },
  { key: "water", label: "Water", color: "bg-chart-3" },
  { key: "wifi", label: "WiFi", color: "bg-chart-4" },
  { key: "parking", label: "Parking", color: "bg-chart-5" },
  { key: "other", label: "Other", color: "bg-chart-6" },
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
  const breakdownTotal = lines.reduce((total, line) => total + invoice.breakdown[line.key], 0);

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          Current invoice
          {invoice.billingPeriod
            ? ` · ${formatBillingPeriodShort(invoice.billingPeriod)}`
            : ""}
        </span>
        <StatusBadge domain="invoice" status={invoice.status} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Total this month</p>
          <p className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
            {formatCurrency(invoice.totalBill)}
          </p>
        </div>
        <Button asChild variant="dark">
          <Link to={ROUTES.user.invoiceDetailsLink(invoice.invoiceID)}>
            View invoice
          </Link>
        </Button>
      </div>

      <p
        className={
          invoice.isOverdue
            ? "text-sm font-medium text-status-danger-fg"
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

      <div className="mt-auto space-y-2.5" aria-label="Invoice charge breakdown">
        <div className="flex h-5 gap-0.5 overflow-hidden rounded-full bg-muted">
          {lines.map((line) => {
            const amount = invoice.breakdown[line.key];
            const percentage = Math.round((amount / breakdownTotal) * 100);
            return (
              <AppTooltip
                key={line.key}
                content={<><span className="block text-page/70">{line.label} · {percentage}%</span><strong className="block text-sm font-semibold text-white">{formatCurrency(amount)}</strong></>}
              >
                <button
                  type="button"
                  aria-label={`${line.label}: ${formatCurrency(amount)}, ${percentage}% of invoice charges`}
                  className={`${line.color} min-w-1 cursor-default focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white`}
                  style={{ flex: amount }}
                />
              </AppTooltip>
            );
          })}
        </div>
        {lines.length > 0 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {lines.map((line) => (
              <li key={line.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span aria-hidden="true" className={`size-2.5 rounded-full ${line.color}`} />
                {line.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Charge breakdown is not available yet.</p>
        )}
      </div>
    </section>
  );
}

export { InvoiceSummaryCard };
