import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";

type Options = {
  /** How long to hold before it counts as a long press. */
  ms?: number;
  /** Finger/mouse may drift this many px before the press is cancelled (so scrolling still works). */
  moveTolerance?: number;
};

/**
 * Pointer-based long press that works for touch, pen and mouse.
 * - quick tap / click / Enter / Space  -> onTap
 * - hold for `ms`, or right-click / context-menu key -> onLongPress
 * `pressing` is true while the user is holding, so the UI can show progress.
 */
export function useLongPress(
  onLongPress: () => void,
  onTap?: () => void,
  { ms = 500, moveTolerance = 10 }: Options = {},
) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const [pressing, setPressing] = useState(false);

  // Keep the latest callbacks without re-creating handlers on every render.
  const longRef = useRef(onLongPress);
  const tapRef = useRef(onTap);
  useEffect(() => {
    longRef.current = onLongPress;
    tapRef.current = onTap;
  });

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    origin.current = null;
    setPressing(false);
  }, []);

  useEffect(() => cancel, [cancel]);

  const trigger = useCallback(() => {
    fired.current = true;
    cancel();
    if (typeof navigator !== "undefined") navigator.vibrate?.(15); // tiny haptic where supported
    longRef.current();
  }, [cancel]);

  return {
    pressing,
    ms,
    handlers: {
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType === "mouse" && e.button !== 0) return; // right-click is handled by onContextMenu
        fired.current = false;
        origin.current = { x: e.clientX, y: e.clientY };
        setPressing(true);
        timer.current = setTimeout(trigger, ms);
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        const o = origin.current;
        if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > moveTolerance) cancel();
      },
      onPointerUp: () => {
        const wasTap = origin.current !== null && !fired.current;
        cancel();
        if (wasTap) tapRef.current?.();
      },
      onPointerLeave: cancel,
      onPointerCancel: cancel, // browsers send this when a touch turns into a scroll
      onContextMenu: (e: MouseEvent<HTMLElement>) => {
        e.preventDefault(); // stop the native menu / iOS+Android long-press callout
        if (!fired.current) trigger();
      },
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          tapRef.current?.();
        }
      },
    },
  };
}
