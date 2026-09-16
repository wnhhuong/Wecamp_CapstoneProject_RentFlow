import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CloseIcon, UploadIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createAdminRoom } from "@/shared/api/admin/rooms.api";
import type {
  AdminArea,
  AdminRoom,
  CreateRoomInput,
  CreateRoomStatus,
} from "@/shared/types/admin/room";

const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

interface RoomFormValues {
  areaID: string;
  roomCode: string;
  floor: string;
  maxPeople: string;
  roomDetail: string;
  price: string;
  deposit: string;
  status: CreateRoomStatus;
  availableFrom: string;
  images: File[];
}

type RoomFormErrors = Partial<Record<keyof RoomFormValues, string>>;

interface AddRoomDialogProps {
  open: boolean;
  areas: AdminArea[];
  onOpenChange: (open: boolean) => void;
  onRoomCreated: (room: AdminRoom) => void;
}

const initialValues: RoomFormValues = {
  areaID: "",
  roomCode: "",
  floor: "1",
  maxPeople: "2",
  roomDetail: "",
  price: "",
  deposit: "",
  status: "available now",
  availableFrom: "",
  images: [],
};

function AddRoomDialog({
  open,
  areas,
  onOpenChange,
  onRoomCreated,
}: AddRoomDialogProps) {
  const [values, setValues] = useState<RoomFormValues>(initialValues);
  const [errors, setErrors] = useState<RoomFormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setValues(initialValues);
    setErrors({});
    setSubmitError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isSubmitting) return;
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  function updateValue<Key extends keyof RoomFormValues>(
    key: Key,
    value: RoomFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSubmitError("");
  }

  function handleImagesChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    const combinedFiles = [...values.images, ...selectedFiles];
    const invalidFile = combinedFiles.find(
      (file) => !file.type.startsWith("image/") || file.size > MAX_IMAGE_SIZE,
    );

    if (invalidFile) {
      setErrors((current) => ({
        ...current,
        images: "Use image files up to 5 MB each.",
      }));
      event.target.value = "";
      return;
    }

    if (combinedFiles.length > MAX_IMAGES) {
      setErrors((current) => ({
        ...current,
        images: `You can upload up to ${MAX_IMAGES} images.`,
      }));
      event.target.value = "";
      return;
    }

    updateValue("images", combinedFiles);
    event.target.value = "";
  }

  function removeImage(index: number) {
    updateValue(
      "images",
      values.images.filter((_, imageIndex) => imageIndex !== index),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedAreaID = values.areaID || areas[0]?.areaID || "";
    const normalizedValues = { ...values, areaID: selectedAreaID };
    const nextErrors = validateRoom(normalizedValues);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitError(
        "Please complete all required fields before adding the room.",
      );
      window.requestAnimationFrame(() => {
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus();
      });
      return;
    }

    const payload: CreateRoomInput = {
      areaID: normalizedValues.areaID,
      roomCode: normalizedValues.roomCode,
      floor: Number(normalizedValues.floor),
      maxPeople: Number(normalizedValues.maxPeople),
      roomDetail: normalizedValues.roomDetail,
      price: Number(normalizedValues.price),
      deposit: Number(normalizedValues.deposit),
      status: normalizedValues.status,
      availableFrom: normalizedValues.availableFrom || null,
      images: normalizedValues.images,
    };

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const createdRoom = await createAdminRoom(payload);
      onRoomCreated(createdRoom);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "The room could not be created. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isAvailableSoon = values.status === "available soon";
  const selectedAreaID = values.areaID || areas[0]?.areaID || "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] w-[min(44rem,calc(100%-2rem))] max-w-none overflow-y-auto rounded-lg bg-field p-5 sm:p-6"
        onEscapeKeyDown={(event) => {
          if (isSubmitting) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (isSubmitting) event.preventDefault();
        }}
      >
        <form ref={formRef} onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle className="text-xl">Add room</DialogTitle>
            <DialogDescription className="leading-5">
              Create the room first. A room account and lease can be set up
              after a tenant is assigned.
            </DialogDescription>
          </DialogHeader>

          {submitError ? (
            <div
              role="alert"
              className="mt-4 rounded-md border border-[#e5b9ad] bg-[#fbeeea] px-3 py-2.5 text-sm text-status-danger-fg"
            >
              {submitError} Your form data has been kept.
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Area" error={errors.areaID} required>
              <NativeSelect
                value={selectedAreaID}
                onChange={(event) => updateValue("areaID", event.target.value)}
                aria-invalid={Boolean(errors.areaID)}
                aria-label="Area"
                className="w-full"
              >
                {areas.map((area) => (
                  <NativeSelectOption key={area.areaID} value={area.areaID}>
                    {area.areaName}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>

            <FormField label="Room code" error={errors.roomCode} required>
              <Input
                value={values.roomCode}
                onChange={(event) =>
                  updateValue("roomCode", event.target.value.toUpperCase())
                }
                placeholder="e.g. A-104"
                maxLength={20}
                aria-invalid={Boolean(errors.roomCode)}
                aria-label="Room code"
              />
            </FormField>

            <FormField label="Floor" error={errors.floor} required>
              <Input
                type="number"
                min="1"
                step="1"
                value={values.floor}
                onChange={(event) => updateValue("floor", event.target.value)}
                aria-invalid={Boolean(errors.floor)}
                aria-label="Floor"
              />
            </FormField>

            <FormField label="Maximum people" error={errors.maxPeople} required>
              <NativeSelect
                value={values.maxPeople}
                onChange={(event) =>
                  updateValue("maxPeople", event.target.value)
                }
                aria-invalid={Boolean(errors.maxPeople)}
                aria-label="Maximum people"
                className="w-full"
              >
                {[1, 2, 3, 4].map((capacity) => (
                  <NativeSelectOption key={capacity} value={capacity}>
                    {capacity} {capacity === 1 ? "person" : "people"}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>

            <FormField label="Monthly rent (VND)" error={errors.price} required>
              <Input
                type="number"
                min="1"
                step="1000"
                value={values.price}
                onChange={(event) => updateValue("price", event.target.value)}
                placeholder="3,200,000"
                aria-invalid={Boolean(errors.price)}
                aria-label="Monthly rent"
              />
            </FormField>

            <FormField label="Deposit (VND)" error={errors.deposit} required>
              <Input
                type="number"
                min="1"
                step="1000"
                value={values.deposit}
                onChange={(event) => updateValue("deposit", event.target.value)}
                placeholder="3,200,000"
                aria-invalid={Boolean(errors.deposit)}
                aria-label="Deposit"
              />
            </FormField>

            <FormField label="Status" error={errors.status} required>
              <NativeSelect
                value={values.status}
                onChange={(event) =>
                  updateValue("status", event.target.value as CreateRoomStatus)
                }
                aria-invalid={Boolean(errors.status)}
                aria-label="Status"
                className="w-full"
              >
                <NativeSelectOption value="available now">
                  AVAILABLE NOW
                </NativeSelectOption>
                <NativeSelectOption value="available soon">
                  AVAILABLE SOON
                </NativeSelectOption>
                <NativeSelectOption value="not available">
                  NOT AVAILABLE
                </NativeSelectOption>
              </NativeSelect>
            </FormField>

            <FormField
              label="Available from"
              error={errors.availableFrom}
              required={isAvailableSoon}
            >
              <Input
                type="date"
                value={values.availableFrom}
                onChange={(event) =>
                  updateValue("availableFrom", event.target.value)
                }
                disabled={!isAvailableSoon}
                aria-invalid={Boolean(errors.availableFrom)}
                aria-label="Available from"
              />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="Room details" error={errors.roomDetail} required>
              <Textarea
                rows={3}
                value={values.roomDetail}
                onChange={(event) =>
                  updateValue("roomDetail", event.target.value)
                }
                placeholder="Describe the room..."
                maxLength={500}
                aria-invalid={Boolean(errors.roomDetail)}
                aria-label="Room details"
              />
            </FormField>
          </div>

          <div className="mt-4">
            <Label htmlFor="room-images">
              Room images <span className="text-destructive">*</span>
            </Label>
            <div
              aria-invalid={Boolean(errors.images)}
              tabIndex={-1}
              className={`mt-2 rounded-lg border border-dashed p-3 ${
                errors.images ? "border-destructive" : "border-input"
              } bg-surface`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                  <UploadIcon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Upload room images</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG or WebP. Up to 4 images, 5 MB each.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  id="room-images"
                  className="block min-h-10 w-full max-w-64 rounded-md border border-input bg-white px-2 py-1.5 text-xs text-muted-foreground file:mr-2 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  disabled={values.images.length >= MAX_IMAGES || isSubmitting}
                  onChange={handleImagesChange}
                />
              </div>

              {values.images.length > 0 ? (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {values.images.map((image, index) => (
                    <li
                      key={`${image.name}-${image.lastModified}`}
                      className="flex min-w-0 items-center gap-2 rounded-md bg-page px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs">
                        {image.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove ${image.name}`}
                        onClick={() => removeImage(index)}
                      >
                        <CloseIcon />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {errors.images ? (
              <p className="mt-1.5 text-xs text-destructive">{errors.images}</p>
            ) : null}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : null}
              {isSubmitting ? "Adding room..." : "Add room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  label,
  error,
  required = false,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label>
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function validateRoom(values: RoomFormValues): RoomFormErrors {
  const errors: RoomFormErrors = {};
  const roomCode = values.roomCode.trim();
  const floor = Number(values.floor);
  const maxPeople = Number(values.maxPeople);
  const price = Number(values.price);
  const deposit = Number(values.deposit);

  if (!values.areaID) errors.areaID = "Select an area.";
  if (!roomCode) {
    errors.roomCode = "Enter a room code.";
  } else if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/i.test(roomCode)) {
    errors.roomCode = "Use letters, numbers and hyphens only.";
  }
  if (!Number.isInteger(floor) || floor < 1) {
    errors.floor = "Enter a floor of 1 or higher.";
  }
  if (!Number.isInteger(maxPeople) || maxPeople < 1 || maxPeople > 4) {
    errors.maxPeople = "Select a capacity from 1 to 4.";
  }
  if (!Number.isInteger(price) || price <= 0) {
    errors.price = "Enter a valid monthly rent.";
  }
  if (!Number.isInteger(deposit) || deposit <= 0) {
    errors.deposit = "Enter a valid deposit.";
  }
  if (!values.roomDetail.trim()) {
    errors.roomDetail = "Describe the room.";
  }
  if (values.status === "available soon" && !values.availableFrom) {
    errors.availableFrom = "Select the availability date.";
  }
  if (values.images.length === 0) {
    errors.images = "Add at least one room image.";
  }

  return errors;
}

export { AddRoomDialog };
