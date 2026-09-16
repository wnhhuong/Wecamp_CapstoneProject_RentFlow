import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadIcon } from "@/components/ui/icons";

interface CaptureStepProps {
  image: File | null;
  previewUrl: string | null;
  error: string | null;
  onSelect: (file: File | null) => void;
  onNext: () => void;
}

export function CaptureStep({
  image,
  previewUrl,
  error,
  onSelect,
  onNext,
}: CaptureStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="space-y-4 rounded-2xl bg-ink p-5 text-page">
      <Input
        ref={inputRef}
        id="meter-image"
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        aria-label="Meter photo"
        onChange={(event) => {
          onSelect(event.currentTarget.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
      />

      <Button
        type="button"
        // variant="ghost"
        aria-label={
          image
            ? "Change electricity meter photo"
            : "Upload an electricity meter photo"
        }
        aria-describedby={
          error ? "meter-image-help meter-image-error" : "meter-image-help"
        }
        aria-invalid={Boolean(error)}
        onClick={() => inputRef.current?.click()}
        className="group h-auto min-h-[250px] w-full flex-col gap-3 whitespace-normal rounded-xl border border-dashed border-page/30 bg-page/5 p-6 text-page hover:border-page/50 hover:bg-page/12 hover:text-page active:border-page/60 active:bg-page/16 active:text-page"
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Selected electricity meter"
              className="max-h-64 max-w-full rounded-lg object-contain"
            />
            <span className="text-sm text-page/60">Click to change photo</span>
          </>
        ) : (
          <>
            <span className="flex size-12 items-center justify-center rounded-xl bg-page/10 transition-colors group-hover:bg-page/16">
              <UploadIcon className="size-6" />
            </span>
            <span className="text-[17px] font-semibold leading-tight">
              Upload an electricity meter photo
            </span>
            <span className="max-w-[360px] text-[13.5px] font-normal leading-relaxed text-page/55">
              Use a clear JPG, PNG or WebP image where every meter digit is
              visible.
            </span>
          </>
        )}
      </Button>

      {error && (
        <p id="meter-image-error" role="alert" className="text-sm">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-sm text-page/55">
          <p id="meter-image-help">JPG, PNG or WebP · maximum 5 MB</p>
          {image && <p className="mt-1 break-all text-page/80">{image.name}</p>}
        </div>
        <Button
          type="button"
          className="px-6"
          disabled={!image}
          onClick={onNext}
        >
          Continue
        </Button>
      </div>
    </section>
  );
}
