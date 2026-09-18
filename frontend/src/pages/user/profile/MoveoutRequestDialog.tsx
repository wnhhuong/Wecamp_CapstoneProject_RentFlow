import { useState } from "react";
import { useNavigate } from "react-router";

import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/router/routes";
import { submitMoveoutRequest } from "@/shared/api/user/requests.api";
import type { TenantContract } from "@/shared/types/contract";
import type { TenantMoveoutRequest } from "@/shared/types/request";
import { formatDate } from "@/shared/utils/dateFormatter";

import {
  getEarliestMoveoutDate,
  MOVEOUT_NOTICE_DAYS,
} from "./utils/moveoutWindow";

interface MoveoutRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: TenantContract;
  onSubmitted: (request: TenantMoveoutRequest) => void;
}

function MoveoutRequestDialog({
  open,
  onOpenChange,
  contract,
  onSubmitted,
}: MoveoutRequestDialogProps) {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sentRequest, setSentRequest] = useState<TenantMoveoutRequest | null>(
    null,
  );

  const earliestDate = getEarliestMoveoutDate();
  const latestDate = contract.expireDate;
  const moveoutDate = selectedDay ? toDateKey(selectedDay) : "";

  async function sendRequest() {
    if (!moveoutDate || isSending) return;

    setIsSending(true);
    setSendError("");

    try {
      const request = await submitMoveoutRequest(moveoutDate);
      setSentRequest(request);
      onSubmitted(request);
    } catch (error: unknown) {
      setSendError(
        error instanceof Error
          ? error.message
          : "The notice could not be sent.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleOpenChange(next: boolean) {
    // Closing mid-send would hide whether the notice went through.
    if (isSending) return;

    if (!next) {
      setSelectedDay(undefined);
      setIsCalendarOpen(false);
      setSendError("");
      setSentRequest(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[min(30rem,calc(100%-2rem))] max-w-none rounded-lg bg-field p-5 sm:p-6">
        {sentRequest ? (
          <SentState
            request={sentRequest}
            onClose={() => handleOpenChange(false)}
          />
        ) : (
          <form
            aria-busy={isSending}
            onSubmit={(event) => {
              event.preventDefault();
              void sendRequest();
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-xl">Give move-out notice</DialogTitle>
              <DialogDescription className="leading-6">
                Tell the owner when you plan to leave room {contract.roomCode}.
                Your lease stays active until you complete the checkout after
                they approve.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-1.5">
              <Label htmlFor="moveout-date">Planned move-out date</Label>

              {/* modal keeps the calendar clickable inside the dialog's focus trap */}
              <Popover
                modal
                open={isCalendarOpen}
                onOpenChange={setIsCalendarOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    id="moveout-date"
                    type="button"
                    variant="outline"
                    disabled={isSending}
                    aria-describedby="moveout-date-help"
                    className="w-full justify-start font-normal"
                  >
                    {selectedDay ? (
                      formatDate(moveoutDate)
                    ) : (
                      <span className="text-muted-foreground">
                        Pick a date
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <Calendar
                    mode="single"
                    autoFocus
                    selected={selectedDay}
                    defaultMonth={selectedDay ?? toDate(earliestDate)}
                    startMonth={toDate(earliestDate)}
                    endMonth={toDate(latestDate)}
                    disabled={{
                      before: toDate(earliestDate),
                      after: toDate(latestDate),
                    }}
                    onSelect={(day) => {
                      setSelectedDay(day);
                      if (day) setIsCalendarOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>

              <p id="moveout-date-help" className="text-sm text-muted-foreground">
                Between {formatDate(earliestDate)} and {formatDate(latestDate)}.
                The owner needs {MOVEOUT_NOTICE_DAYS} days&rsquo; notice.
              </p>
            </div>

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
                Cancel
              </Button>
              <Button type="submit" disabled={!moveoutDate || isSending}>
                {isSending ? <Spinner /> : null}
                {isSending ? "Sending…" : "Send notice"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SentState({
  request,
  onClose,
}: {
  request: TenantMoveoutRequest;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">Move-out notice sent</DialogTitle>
        <DialogDescription className="leading-6">
          Once the owner approves, finish by submitting a checkout with your
          final meter reading.
        </DialogDescription>
      </DialogHeader>

      <dl className="mt-4">
        <Row label="Request ID" value={request.displayID} />
        <Row
          label="Move-out date"
          value={formatDate(request.requestMoveoutDate)}
        />
        <div className="flex items-start justify-between gap-4 border-b border-hairline py-2.5 text-sm last:border-b-0">
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <StatusBadge domain="request" status={request.status} />
          </dd>
        </div>
      </dl>

      <DialogFooter className="mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onClose();
            void navigate(ROUTES.user.requestDetailsLink(request.requestID));
          }}
        >
          View request
        </Button>
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-hairline py-2.5 text-sm last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

/**
 * The calendar works in the browser's own timezone, so the key is built from
 * the local parts of the day the tenant clicked rather than a UTC conversion.
 */
function toDateKey(day: Date): string {
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");

  return `${day.getFullYear()}-${month}-${date}`;
}

function toDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

export { MoveoutRequestDialog };
