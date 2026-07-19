import { useCallback, useEffect, useRef } from "react";

export interface SwipeLayerProps {
  content: React.ReactNode;
  direction?: "left" | "right";
  duration?: number;
  onRemoveOld?: () => void;
  prevContent?: React.ReactNode;
}

export function SwipeLayer({
  prevContent,
  content,
  direction,
  duration = 300,
  onRemoveOld,
}: SwipeLayerProps) {
  const cleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRemove = useCallback(() => {
    onRemoveOld?.();
  }, [onRemoveOld]);

  useEffect(() => {
    if (prevContent) {
      if (cleanupRef.current) {
        clearTimeout(cleanupRef.current);
      }
      cleanupRef.current = setTimeout(handleRemove, 250);
      return () => {
        if (cleanupRef.current) {
          clearTimeout(cleanupRef.current);
        }
      };
    }
  }, [prevContent, handleRemove]);

  if (!prevContent) {
    return (
      <div className="pointer-events-auto absolute inset-0">
        <div className="px-4">{content}</div>
      </div>
    );
  }

  return (
    <>
      {/* Previous content — slides off in direction of travel */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          animation:
            direction === "right"
              ? "swipeSlideLeftOut 250ms cubic-bezier(0.23, 1, 0.32, 1) forwards"
              : "swipeSlideRightOut 250ms cubic-bezier(0.23, 1, 0.32, 1) forwards",
        }}
      >
        <div className="px-4">{prevContent}</div>
      </div>

      {/* Current content — slides in from opposite direction */}
      <div className="pointer-events-auto absolute inset-0">
        <div className="px-4">
          <div
            className="swipe-layer-enter"
            style={
              {
                animationName: "swipeEnter",
                animationDuration: `${duration}ms`,
                animationTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                animationFillMode: "both",
                "--slide-in-from": direction === "right" ? "100%" : "-100%",
              } as React.CSSProperties
            }
          >
            {content}
          </div>
        </div>
      </div>
    </>
  );
}
