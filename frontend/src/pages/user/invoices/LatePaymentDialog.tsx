import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/shared/utils/dateFormatter";

interface LatePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dueDate: string;
}

function LatePaymentDialog({
  open,
  onOpenChange,
  dueDate,
}: LatePaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(30rem,calc(100%-2rem))] max-w-none rounded-lg bg-field p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">Request late payment</DialogTitle>
          <DialogDescription className="leading-6">
            Tell the owner you may not be able to pay before{" "}
            {formatDate(dueDate)}. The invoice stays unpaid until the owner
            confirms your payment.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { LatePaymentDialog };
