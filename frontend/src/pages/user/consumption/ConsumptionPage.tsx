import { ErrorState } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useConsumptionSubmission } from "@/shared/hooks/useConsumptionSubmission";
import type { ConsumptionContext } from "@/shared/types/consumption";
import { Spinner } from "@/components/ui/spinner";
import { formatDate, getDateKey } from "@/shared/utils/dateFormatter";

import { CaptureStep } from "./CaptureStep";
import { ReviewStep } from "./ReviewStep";
import { SentStep } from "./SentStep";

const steps = [
  { id: "capture", label: "Upload" },
  { id: "review", label: "Confirm" },
  { id: "sent", label: "Owner review" },
  { id: "approved", label: "Approved" },
] as const;

function getAvailabilityMessage(context: ConsumptionContext) {
  const today = getDateKey();
  const startDate = getDateKey(context.windowStart);
  const endDate = getDateKey(context.windowEnd);

  if (today < startDate) {
    return {
      title: `Nothing to do now.`,
      description: `Come back on ${formatDate(context.windowStart)} to take a clear meter photo and enter the reading.\nPlease send it by ${formatDate(context.windowEnd)}.`,
    };
  }

  if (today > endDate) {
    return {
      title: "This reading period has ended",
      description:
        `The deadline was ${formatDate(context.windowEnd)}. ` +
        "If you missed it, please contact your owner.",
    };
  }

  return {
    title: "A new reading cannot be submitted right now",
    description:
      "Your room may already have a reading recorded for this period. Please check with your owner if you still need to send one.",
  };
}

export default function ConsumptionPage() {
  const flow = useConsumptionSubmission();
  const context = flow.context;
  const currentStep = flow.result?.status === "approved"
    ? "approved"
    : context?.existingRequestID != null ? "sent" : flow.step;
  const currentIndex = steps.findIndex((item) => item.id === currentStep);
  const showProgress = context && (context.canSubmit || context.existingRequestID != null || flow.result);
  const availability = context ? getAvailabilityMessage(context) : null;
  const pageDescription = context
    ? flow.result?.status === "approved"
      ? "Reading approved by owner."
      : flow.result || context.existingRequestID != null
        ? "Waiting for owner approval."
        : context.canSubmit
          ? `Please send your reading by ${formatDate(context.windowEnd)}.`
          : "Monthly electricity reading status."
    : "";

  return (
    <div className="max-w-3xl space-y-6 p-4 md:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Electricity reading
        </h1>
        <p className="text-sm text-muted-foreground">
          {context ? `Room ${context.roomCode} · ` : ""}
          {pageDescription}
        </p>
      </header>

      {showProgress && (
        <ol aria-label="Submission progress" className="flex flex-wrap items-center gap-1.5">
          {steps.map((item, index) => (
            <li
              key={item.id}
              aria-current={item.id === currentStep ? "step" : undefined}
              className="flex items-center gap-1.5 text-xs font-medium"
            >
              <span className={`flex size-[22px] items-center justify-center rounded-full font-semibold ${
                index <= currentIndex ? "bg-ink text-page" : "bg-hairline text-muted-foreground"
              }`}>
                {index + 1}
              </span>
              <span className={index <= currentIndex ? "text-ink" : "text-muted-foreground"}>
                {item.label}
              </span>
              <span aria-hidden="true" className="h-px w-[18px] bg-input" />
            </li>
          ))}
        </ol>
      )}

      {!context ? (
        flow.loading ? (
          <Card>
            <CardContent
              role="status"
              aria-label="Loading electricity reading"
              className="space-y-4"
            >
              <span className="sr-only">Loading electricity reading</span>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-9 w-32" />
            </CardContent>
          </Card>
        ) : (
          <ErrorState
            description={
              flow.loadError ?? "Could not load reading information."
            }
            onRetry={flow.reload}
          />
        )
      ) : flow.result ? (
        <SentStep result={flow.result} onRefresh={flow.reload} refreshing={flow.loading} />
      ) : context.existingRequestID != null ? (
        flow.loading ? (
          <Card><CardContent className="flex min-h-40 items-center justify-center">
            <Spinner className="size-6 text-primary" aria-label="Loading your reading" />
          </CardContent></Card>
        ) : (
          <ErrorState description={flow.loadError ?? "Could not load your reading."} onRetry={flow.reload} />
        )
      ) : !context.canSubmit && availability ? (
        <Card>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                Monthly meter reading
              </p>

              <div className="relative" aria-busy={flow.loading}>
                <div
                  className={`space-y-2 ${flow.loading ? "invisible" : ""}`}
                  aria-hidden={flow.loading}
                >
                  <h2 className="text-xl font-semibold leading-snug">
                    {availability.title}
                  </h2>
                  <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {availability.description}
                  </p>
                </div>

                {flow.loading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Spinner
                      className="size-6 text-primary"
                      aria-label="Refreshing reading status"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button
                type="button"
                size="sm"
                className="min-w-32"
                disabled={flow.loading}
                onClick={flow.reload}
              >
                Refresh status
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>



          {flow.step === "capture" ? (
            <CaptureStep
              image={flow.image}
              previewUrl={flow.previewUrl}
              error={flow.imageError}
              onSelect={flow.selectImage}
              onNext={flow.next}
            />
          ) : (
            <ReviewStep
              previewUrl={flow.previewUrl}
              capturedAt={flow.capturedAt}
              reading={flow.reading}
              validReading={flow.validReading}
              submitting={flow.submitting}
              error={flow.submitError}
              onReadingChange={flow.setReading}
              onBack={flow.back}
              onSubmit={flow.send}
            />
          )}
        </>
      )}
      {context && flow.loadError && (flow.result || context.existingRequestID == null) && (
        <p role="alert" className="text-sm text-destructive">
          Could not refresh the reading status. Please try again.
        </p>
      )}
    </div>
  );
}
