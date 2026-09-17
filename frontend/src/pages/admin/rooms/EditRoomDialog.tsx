import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CloseIcon, UploadIcon } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { updateAdminRoom } from '@/shared/api/admin/rooms.api'
import type { AdminRoom } from '@/shared/types/admin/room'
import {
  formatAmountInput,
  toAmountDigits,
} from '@/shared/utils/currencyFormatter'

const MAX_IMAGES = 4
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

interface EditRoomDialogProps {
  room: AdminRoom | null
  onOpenChange: (open: boolean) => void
  onRoomUpdated: (room: AdminRoom) => void
}

interface EditRoomValues {
  roomCode: string
  floor: string
  maxPeople: string
  roomDetail: string
  price: string
  deposit: string
  replacementImages: File[]
}

type EditRoomErrors = Partial<Record<keyof EditRoomValues | 'form', string>>

function EditRoomDialog({
  room,
  onOpenChange,
  onRoomUpdated,
}: EditRoomDialogProps) {
  return (
    <Dialog open={room !== null} onOpenChange={onOpenChange}>
      {room ? (
        <EditRoomForm
          key={room.roomID}
          room={room}
          onCancel={() => onOpenChange(false)}
          onRoomUpdated={onRoomUpdated}
        />
      ) : null}
    </Dialog>
  )
}

function EditRoomForm({
  room,
  onCancel,
  onRoomUpdated,
}: {
  room: AdminRoom
  onCancel: () => void
  onRoomUpdated: (room: AdminRoom) => void
}) {
  const [values, setValues] = useState<EditRoomValues>(() => ({
    roomCode: room.roomCode,
    floor: String(room.floor),
    maxPeople: String(room.maxPeople),
    roomDetail: room.roomDetail,
    price: formatAmountInput(String(room.price)),
    deposit: formatAmountInput(String(room.deposit)),
    replacementImages: [],
  }))
  const [errors, setErrors] = useState<EditRoomErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function updateValue<Key extends keyof EditRoomValues>(
    key: Key,
    value: EditRoomValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }))
  }

  function handleImagesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    const imageError = validateImages(files)

    if (imageError) {
      setErrors((current) => ({ ...current, replacementImages: imageError }))
      event.target.value = ''
      return
    }

    updateValue('replacementImages', files)
  }

  function removeImage(index: number) {
    updateValue(
      'replacementImages',
      values.replacementImages.filter((_, itemIndex) => itemIndex !== index),
    )
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateRoom(values)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const updatedRoom = await updateAdminRoom({
        roomID: room.roomID,
        roomCode: values.roomCode,
        floor: Number(values.floor),
        maxPeople: Number(values.maxPeople),
        roomDetail: values.roomDetail,
        price: Number(toAmountDigits(values.price)),
        deposit: Number(toAmountDigits(values.deposit)),
        replacementImages: values.replacementImages,
      })
      onRoomUpdated(updatedRoom)
      onCancel()
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : 'The room could not be updated.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Edit {room.roomCode}</DialogTitle>
        <DialogDescription>
          Update public room information. The room lifecycle status and active
          contract snapshot will not be changed.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        {errors.form ? (
          <div role="alert" className="mb-4 rounded-md bg-status-danger-bg px-4 py-3 text-sm text-status-danger-fg">
            {errors.form}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Room code" error={errors.roomCode} required>
            <Input
              value={values.roomCode}
              onChange={(event) => updateValue('roomCode', event.target.value.toUpperCase())}
              maxLength={20}
              disabled={isSubmitting}
            />
          </FormField>
          <FormField label="Floor" error={errors.floor} required>
            <Input
              type="number"
              min="0"
              step="1"
              value={values.floor}
              onChange={(event) => updateValue('floor', event.target.value)}
              disabled={isSubmitting}
            />
          </FormField>
          <FormField label="Maximum people" error={errors.maxPeople} required>
            <Input
              type="number"
              min="1"
              step="1"
              value={values.maxPeople}
              onChange={(event) => updateValue('maxPeople', event.target.value)}
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Monthly price (VND)" error={errors.price} required>
            <Input
              inputMode="numeric"
              value={values.price}
              onChange={(event) => updateValue('price', formatAmountInput(event.target.value))}
              disabled={isSubmitting}
            />
          </FormField>
          <FormField label="Deposit (VND)" error={errors.deposit} required>
            <Input
              inputMode="numeric"
              value={values.deposit}
              onChange={(event) => updateValue('deposit', formatAmountInput(event.target.value))}
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Room description" error={errors.roomDetail} required>
            <Textarea
              rows={4}
              value={values.roomDetail}
              onChange={(event) => updateValue('roomDetail', event.target.value)}
              maxLength={500}
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField
            label="Replacement images"
            error={errors.replacementImages}
            hint={`Keep empty to retain the current ${room.images.length} image${room.images.length === 1 ? '' : 's'}. Selecting files replaces the full image set.`}
          >
            <div className="rounded-lg border border-dashed border-input bg-surface p-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                  <UploadIcon className="size-5" />
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  disabled={isSubmitting}
                  onChange={handleImagesChange}
                  className="block min-h-10 min-w-0 flex-1 rounded-md border border-input bg-white px-2 py-1.5 text-xs text-muted-foreground file:mr-2 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium"
                />
              </div>
              {values.replacementImages.length > 0 ? (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {values.replacementImages.map((image, index) => (
                    <li key={`${image.name}-${image.lastModified}`} className="flex min-w-0 items-center gap-2 rounded-md bg-page px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-xs">{image.name}</span>
                      <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove ${image.name}`} onClick={() => removeImage(index)}>
                        <CloseIcon />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </FormField>
        </div>

        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

function FormField({
  label,
  error,
  hint,
  required = false,
  children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function validateRoom(values: EditRoomValues): EditRoomErrors {
  const errors: EditRoomErrors = {}
  const floor = Number(values.floor)
  const maxPeople = Number(values.maxPeople)
  const price = Number(toAmountDigits(values.price))
  const deposit = Number(toAmountDigits(values.deposit))

  if (!values.roomCode.trim()) errors.roomCode = 'Enter a room code.'
  if (!Number.isInteger(floor) || floor < 0) errors.floor = 'Enter a floor of 0 or higher.'
  if (!Number.isInteger(maxPeople) || maxPeople < 1) errors.maxPeople = 'Enter a capacity of at least 1.'
  if (!Number.isFinite(price) || price < 0 || !values.price) errors.price = 'Enter a valid monthly price.'
  if (!Number.isFinite(deposit) || deposit < 0 || !values.deposit) errors.deposit = 'Enter a valid deposit.'
  if (!values.roomDetail.trim()) errors.roomDetail = 'Enter a room description.'

  return errors
}

function validateImages(files: File[]) {
  if (files.length > MAX_IMAGES) return `Select no more than ${MAX_IMAGES} images.`
  if (files.some((file) => !ACCEPTED_IMAGE_TYPES.has(file.type))) return 'Use JPG, PNG or WebP images only.'
  if (files.some((file) => file.size > MAX_IMAGE_SIZE)) return 'Each image must be 5 MB or smaller.'
  return ''
}

export { EditRoomDialog }
