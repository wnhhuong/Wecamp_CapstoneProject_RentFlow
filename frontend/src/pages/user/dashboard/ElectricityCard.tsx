import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/router/routes";
import type {
  DashboardElectricity,
  ElectricityReminderState,
} from "@/shared/types/dashboard";
import {
  formatDate,
  formatMonthYearShort,
} from "@/shared/utils/dateFormatter";

const COPY: Record<
  ElectricityReminderState,
  { pill: string; pillClass: string; title: string; body: string; cta: string }
> = {
  due_not_uploaded: {
    pill: "Photo needed",
    pillClass: "bg-status-warning-bg text-status-warning-fg",
    title: "Send this month's reading",
    body: "The window is open. Send your reading so the owner can bill this month.",
    cta: "Submit reading",
  },
  not_due: {
    pill: "Not due",
    pillClass: "bg-status-neutral-bg text-status-neutral-fg",
    title: "Nothing to do yet",
    body: "This month's window has not opened. You will be asked once it does.",
    cta: "Open electricity",
  },
  submitted: {
    pill: "Sent",
    pillClass: "bg-status-success-bg text-status-success-fg",
    title: "Reading sent",
    body: "The owner turns it into your next invoice once they approve it.",
    cta: "Open electricity",
  },
};

function ElectricityCard({ electricity }: { electricity: DashboardElectricity }) {
  const copy = COPY[electricity.state];

  return (
    <section className="flex min-w-0 flex-col gap-3.5 rounded-xl bg-ink p-5 text-page">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-page/50">
          Electricity
          {electricity.startDate
            ? ` · ${formatMonthYearShort(electricity.startDate)}`
            : ""}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${copy.pillClass}`}
        >
          {copy.pill}
        </span>
      </div>

      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <p className="text-sm leading-6 text-page/65">{copy.body}</p>

      {electricity.startDate && electricity.endDate ? (
        <p className="text-sm text-page/50">
          {formatDate(electricity.startDate)} –{" "}
          {formatDate(electricity.endDate)}
        </p>
      ) : null}

      <Button asChild className="mt-auto self-start">
        <Link to={ROUTES.user.electricity}>{copy.cta}</Link>
      </Button>
    </section>
  );
}

export { ElectricityCard };
