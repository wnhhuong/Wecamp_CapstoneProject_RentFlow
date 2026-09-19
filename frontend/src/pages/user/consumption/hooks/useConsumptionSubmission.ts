import { useEffect, useRef, useState } from "react";

import {
  getConsumptionContext,
  getConsumptionRequest,
  submitConsumption,
} from "@/shared/api/user/consumption.api";
import { getLatestMeterReading } from "@/shared/api/user/invoices.api";
import type {
  ConsumptionContext,
  ConsumptionRequest,
} from "@/shared/types/consumption";

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

interface ContextSnapshot {
  context: ConsumptionContext;
  existing: ConsumptionRequest | null;
}

// Kept free of React state so effects can call it without triggering
// react-hooks/set-state-in-effect; state is applied in the promise callback.
async function loadContextSnapshot(
  signal?: AbortSignal,
): Promise<ContextSnapshot | null> {
  const context = await getConsumptionContext(signal);
  if (signal?.aborted) return null;

  if (context.existingRequestID == null) {
    return { context, existing: null };
  }

  const existing = await getConsumptionRequest(context.existingRequestID, signal);
  if (signal?.aborted) return null;

  return { context, existing };
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
  const [lastReading, setLastReading] = useState<number | null>(null);

  const submissionLock = useRef(false);
  const previewUrlRef = useRef<string | null>(null);

  function applyContextSnapshot(snapshot: ContextSnapshot) {
    setContext(snapshot.context);

    if (snapshot.existing) {
      setResult(snapshot.existing);
      setStep("sent");
    } else {
      setResult(null);
      setStep((current) => current === "sent" ? "capture" : current);
    }
  }

  async function refreshContext(signal?: AbortSignal) {
    const snapshot = await loadContextSnapshot(signal);
    if (snapshot) applyContextSnapshot(snapshot);
  }

  useEffect(() => {
    const controller = new AbortController();

    loadContextSnapshot(controller.signal)
      .then((snapshot) => {
        if (snapshot) applyContextSnapshot(snapshot);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const controller = new AbortController();

    getLatestMeterReading(controller.signal)
      .then((reading) => setLastReading(reading))
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const numericReading = Number(reading);
  const validReading =
    /^\d+$/.test(reading) &&
    Number.isSafeInteger(numericReading) &&
    numericReading >= (lastReading ?? 0);

  function selectImage(file: File | null) {
    if (!file) return;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setImage(null);
    setPreviewUrl(null);
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

    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;

    setImage(file);
    setPreviewUrl(nextPreviewUrl);
    setCapturedAt(new Date().toISOString());
  }

  function reload() {
    setLoading(true);
    setLoadError(null);
    setReloadKey((value) => value + 1);
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
    reload,
    step,
    image,
    previewUrl,
    capturedAt,
    reading,
    setReading,
    validReading,
    lastReading,
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
