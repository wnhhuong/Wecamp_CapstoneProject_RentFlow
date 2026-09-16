import { useEffect, useRef, useState } from "react";

import {
  getConsumptionContext,
  getConsumptionRequest,
  submitConsumption,
} from "@/shared/api/user/consumption.api";
import type {
  ConsumptionContext,
  ConsumptionRequest,
} from "../types/consumption";

export type ConsumptionStep = "capture" | "review" | "sent";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function useConsumptionSubmission() {
  const [context, setContext] = useState<ConsumptionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [step, setStep] = useState<ConsumptionStep>("capture");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState("");
  const [reading, setReading] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ConsumptionRequest | null>(null);

  const submissionLock = useRef(false);

  async function refreshContext(signal?: AbortSignal) {
    const data = await getConsumptionContext(signal);
    if (signal?.aborted) return;
    setContext(data);

    if (data.existingRequestID != null) {
      const existing = await getConsumptionRequest(data.existingRequestID, signal);
      if (signal?.aborted) return;
      setResult(existing);
      setStep("sent");
    } else {
      setResult(null);
      setStep((current) => current === "sent" ? "capture" : current);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setLoadError(null);

    refreshContext(controller.signal)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(image);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [image]);

  const numericReading = Number(reading);
  const validReading =
    /^\d+$/.test(reading) &&
    Number.isSafeInteger(numericReading) &&
    numericReading >= 0;

  function selectImage(file: File | null) {
    if (!file) return;

    setImage(null);
    setCapturedAt("");
    setImageError(null);
    setSubmitError(null);

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Choose a JPG, PNG or WebP image.");
      return;
    }

    if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
      setImageError("Choose a non-empty image up to 5 MB.");
      return;
    }

    setImage(file);
    setCapturedAt(new Date().toISOString());
  }

  async function send() {
    if (
      submissionLock.current ||
      step !== "review" ||
      !context?.canSubmit ||
      !image ||
      !capturedAt ||
      !validReading
    ) {
      return;
    }

    submissionLock.current = true;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Recheck eligibility: another tab may already have submitted,
      // or the submission window may have closed.
      const latest = await getConsumptionContext();
      setContext(latest);

      if (!latest.canSubmit) {
        await refreshContext();
        return;
      }

      const created = await submitConsumption({
        image,
        reading: numericReading,
        capturedAt,
      });

      setResult(created);
      setStep("sent");
    } catch (error: unknown) {
      setSubmitError(errorMessage(error));

      // Also reconcile after a failed/ambiguous POST.
      // Never automatically retry a mutation.
      try {
        await refreshContext();
      } catch {
        // Keep the original error and draft if reconciliation fails.
      }
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  }

  return {
    context,
    loading,
    loadError,
    reload: () => setReloadKey((value) => value + 1),
    step,
    image,
    previewUrl,
    capturedAt,
    reading,
    setReading,
    validReading,
    imageError,
    submitError,
    submitting,
    result,
    selectImage,
    next: () => {
      if (image && context?.canSubmit) setStep("review");
    },
    back: () => {
      if (!submissionLock.current) {
        setSubmitError(null);
        setStep("capture");
      }
    },
    send,
  };
}
