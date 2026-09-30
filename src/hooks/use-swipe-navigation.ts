import { useCallback, useRef } from "react";

/**
 * Distance (px) a touch must travel before we decide whether the gesture is a
 * horizontal swipe or a vertical scroll. Below this we stay undecided so a
 * slightly diagonal drag doesn't get misclassified.
 */
const AXIS_LOCK_DISTANCE = 10;

export interface SwipeHandlers {
  onClickCapture: (event: React.MouseEvent) => void;
  onTouchCancel: () => void;
  onTouchEnd: (event: React.TouchEvent) => void;
  onTouchMove: (event: React.TouchEvent) => void;
  onTouchStart: (event: React.TouchEvent) => void;
}

export interface UseSwipeNavigationOptions {
  /** Finger moves left — same as "next". */
  onSwipeLeft?: () => void;
  /** Finger moves right — same as "previous". */
  onSwipeRight?: () => void;
  /** Minimum horizontal distance (px) required to commit a swipe. */
  threshold?: number;
}

/**
 * Turns horizontal touch drags into left/right callbacks. The caller spreads the
 * returned handlers onto a container marked `touch-pan-y` so the browser keeps
 * owning vertical scrolling while we own horizontal gestures.
 *
 * A horizontal drag also suppresses the click that the browser would otherwise
 * fire on release, so swiping never accidentally taps a card.
 */
export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  threshold = 60,
}: UseSwipeNavigationOptions): SwipeHandlers {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const axisRef = useRef<"pending" | "horizontal" | "vertical">("pending");
  const suppressClickRef = useRef(false);

  const reset = useCallback(() => {
    startRef.current = null;
    axisRef.current = "pending";
  }, []);

  const onTouchStart = useCallback(
    (event: React.TouchEvent) => {
      suppressClickRef.current = false;

      if (event.touches.length !== 1) {
        reset();
        return;
      }

      const touch = event.touches[0];
      startRef.current = { x: touch.clientX, y: touch.clientY };
      axisRef.current = "pending";
    },
    [reset]
  );

  const onTouchMove = useCallback((event: React.TouchEvent) => {
    const start = startRef.current;
    const touch = event.touches[0];

    if (!(start && touch) || axisRef.current !== "pending") {
      return;
    }

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (
      Math.abs(dx) < AXIS_LOCK_DISTANCE &&
      Math.abs(dy) < AXIS_LOCK_DISTANCE
    ) {
      return;
    }

    axisRef.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
  }, []);

  const onTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      const start = startRef.current;
      const axis = axisRef.current;
      const touch = event.changedTouches[0];

      reset();

      if (axis !== "horizontal") {
        return;
      }

      // Any horizontal drag swallows the follow-up click, not just committed ones.
      suppressClickRef.current = true;

      if (!(start && touch)) {
        return;
      }

      const dx = touch.clientX - start.x;

      if (dx <= -threshold) {
        onSwipeLeft?.();
      } else if (dx >= threshold) {
        onSwipeRight?.();
      }
    },
    [onSwipeLeft, onSwipeRight, reset, threshold]
  );

  const onClickCapture = useCallback((event: React.MouseEvent) => {
    if (!suppressClickRef.current) {
      return;
    }
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: reset,
    onClickCapture,
  };
}
