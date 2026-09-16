import { Link } from "react-router";

import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/router/routes";
import type { ConsumptionRequest } from "@/shared/types/consumption";
import { formatCurrency } from "@/shared/utils/currencyFormatter";

interface SentStepProps {
  result: ConsumptionRequest;
  onRefresh: () => void;
  refreshing: boolean;
}

export function SentStep({ result, onRefresh, refreshing }: SentStepProps) {
  const approved = result.status === "approved";
  const cost = formatCurrency(result.correspondingCost);

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="relative min-h-52" aria-busy={refreshing}>
          <div
            className={`space-y-5 ${refreshing ? "invisible" : ""}`}
            aria-hidden={refreshing}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">
                {approved
                  ? "Reading approved by owner"
                  : "Reading sent for approval"}
              </h2>
              <StatusBadge domain="request" status={result.status} />
            </div>

            <dl className="grid grid-cols-2 gap-3 rounded-lg bg-field p-4 text-sm text-foreground">
              <dt>Previous reading</dt>
              <dd className="text-right">{result.previousReading} kWh</dd>
              <dt>Current reading</dt>
              <dd className="text-right">{result.reading} kWh</dd>
              <dt>Electricity used</dt>
              <dd className="text-right">{result.usage} kWh</dd>
              <Separator className="col-span-2 my-1" />
              <dt className="font-semibold">Electricity cost</dt>
              <dd className="text-right font-semibold">{cost}</dd>
            </dl>

            <p className="text-sm text-muted-foreground">
              {approved
                ? "Your owner has approved this meter reading."
                : "Your reading is waiting for the owner’s approval."}
            </p>
          </div>

          {refreshing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner
                className="size-6 text-primary"
                aria-label="Refreshing reading status"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
          <Button asChild variant="outline">
            <Link to={ROUTES.user.dashboard}>Back to home</Link>
          </Button>
          {approved ? (
            <Button asChild>
              <Link to={ROUTES.user.invoices}>View invoices</Link>
            </Button>
          ) : (
            <Button type="button" disabled={refreshing} onClick={onRefresh}>
              Refresh status
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
