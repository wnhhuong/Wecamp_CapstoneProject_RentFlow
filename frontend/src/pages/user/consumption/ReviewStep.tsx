import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/shared/utils/dateFormatter'

interface ReviewStepProps {
  previewUrl: string | null
  capturedAt: string
  reading: string
  validReading: boolean
  submitting: boolean
  error: string | null
  onReadingChange: (value: string) => void
  onBack: () => void
  onSubmit: () => Promise<void>
}

export function ReviewStep({
  previewUrl,
  capturedAt,
  reading,
  validReading,
  submitting,
  error,
  onReadingChange,
  onBack,
  onSubmit,
}: ReviewStepProps) {
  const invalid = reading !== '' && !validReading

  return (
    <Card>
      <CardContent>
        <form
          className="space-y-5"
          aria-busy={submitting}
          onSubmit={(event) => {
            event.preventDefault()
            void onSubmit()
          }}
        >
          <h2 className="text-lg font-semibold">Review your meter reading</h2>

          <div className="flex flex-wrap items-center gap-4">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Electricity meter to submit"
                className="h-32 w-44 rounded-lg bg-ink object-contain"
              />
            )}
            <div className="text-sm">
              <p className="text-muted-foreground">Uploaded</p>
              <time dateTime={capturedAt}>
                {formatDate(capturedAt, true)}
              </time>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meter-reading">The number you read (kWh)</Label>
            <Input
              id="meter-reading"
              type="text"
              inputMode="numeric"
              pattern="[0-9]+"
              required
              value={reading}
              disabled={submitting}
              aria-invalid={invalid}
              aria-describedby="meter-reading-help"
              className="h-14 text-2xl font-semibold md:text-2xl"
              onChange={(event) => onReadingChange(event.target.value)}
            />
            <p
              id="meter-reading-help"
              className={invalid ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}
            >
              Enter the full meter reading as a whole number, zero or greater.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={onBack}
            >
              Change photo
            </Button>
            <Button type="submit" disabled={!validReading || submitting}>
              {submitting ? 'Sending…' : 'Confirm & send to owner'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
