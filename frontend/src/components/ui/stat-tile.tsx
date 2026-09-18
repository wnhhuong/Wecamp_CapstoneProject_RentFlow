import { useEffect, useRef, useState } from "react";

import { cn } from "@/shared/utils/cn";

const COUNT_UP_MS = 900;

/**
 * Counts from zero to the target so a figure lands rather than appears.
 * Jumps straight to the target when the viewer asked for less motion.
 */
function useCountUp(target: number, duration = COUNT_UP_MS): number {
  const [value, setValue] = useState(0);
  const startValue = useRef(0);

  useEffect(() => {
    const from = startValue.current;
    if (from === target) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      startValue.current = target;
      setValue(target);
      return;
    }

    const startedAt = performance.now();
    let frame = requestAnimationFrame(function step(now: number) {
      const progress = Math.min(1, (now - startedAt) / duration);
      // Ease out: fast first, then settling.
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(from + (target - from) * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(step);
      } else {
        startValue.current = target;
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

interface StatTileProps {
  label: string;
  value: number;
  format: (value: number) => string;
  /** Small line under the figure, e.g. a share of the total. */
  hint?: string;
  /** Inverts the tile for the one figure that matters most. */
  highlight?: boolean;
}

function StatTile({
  label,
  value,
  format,
  hint,
  highlight = false,
}: StatTileProps) {
  const shown = useCountUp(value);

  return (
    <div
      className={cn(
        "grid content-start gap-1.5 rounded-lg border p-4",
        highlight
          ? "border-ink bg-ink text-page"
          : "border-hairline bg-surface text-foreground",
      )}
    >
      <p
        className={cn(
          "text-sm",
          highlight ? "text-page/70" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-3">
        <p className="text-xl font-semibold tabular-nums">{format(shown)}</p>
        {hint ? (
          <p
            className={cn(
              "text-xs",
              highlight ? "text-page/60" : "text-muted-foreground",
            )}
          >
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export { StatTile };
