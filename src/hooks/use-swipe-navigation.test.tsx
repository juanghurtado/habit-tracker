import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSwipeNavigation } from "./use-swipe-navigation.ts";

interface HarnessProps {
  onClick?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

function Harness({
  onSwipeLeft,
  onSwipeRight,
  onClick,
  threshold,
}: HarnessProps) {
  const handlers = useSwipeNavigation({
    onSwipeLeft,
    onSwipeRight,
    threshold,
  });

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: test harness needs a plain surface
    // biome-ignore lint/a11y/noStaticElementInteractions: test harness needs a plain surface
    // biome-ignore lint/a11y/useKeyWithClickEvents: test harness needs a plain surface
    <div data-testid="surface" onClick={onClick} {...handlers} />
  );
}

function swipe(
  element: HTMLElement,
  fromX: number,
  toX: number,
  fromY = 100,
  toY = 100
) {
  fireEvent.touchStart(element, {
    touches: [{ clientX: fromX, clientY: fromY }],
  });
  fireEvent.touchMove(element, {
    touches: [{ clientX: toX, clientY: toY }],
  });
  fireEvent.touchEnd(element, {
    changedTouches: [{ clientX: toX, clientY: toY }],
  });
}

describe("useSwipeNavigation", () => {
  it("fires onSwipeLeft when the finger moves left past the threshold", () => {
    const onSwipeLeft = vi.fn();
    render(<Harness onSwipeLeft={onSwipeLeft} />);

    swipe(screen.getByTestId("surface"), 200, 100);

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it("fires onSwipeRight when the finger moves right past the threshold", () => {
    const onSwipeRight = vi.fn();
    render(<Harness onSwipeRight={onSwipeRight} />);

    swipe(screen.getByTestId("surface"), 100, 200);

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it("ignores drags shorter than the threshold", () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    render(<Harness onSwipeLeft={onSwipeLeft} onSwipeRight={onSwipeRight} />);

    swipe(screen.getByTestId("surface"), 200, 180);

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it("honours a custom threshold", () => {
    const onSwipeLeft = vi.fn();
    render(<Harness onSwipeLeft={onSwipeLeft} threshold={200} />);

    swipe(screen.getByTestId("surface"), 250, 100);

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("ignores vertical drags", () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    render(<Harness onSwipeLeft={onSwipeLeft} onSwipeRight={onSwipeRight} />);

    swipe(screen.getByTestId("surface"), 100, 100, 50, 250);

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it("keeps the gesture vertical once the axis is locked", () => {
    const onSwipeLeft = vi.fn();
    render(<Harness onSwipeLeft={onSwipeLeft} />);

    const surface = screen.getByTestId("surface");
    fireEvent.touchStart(surface, {
      touches: [{ clientX: 200, clientY: 100 }],
    });
    fireEvent.touchMove(surface, {
      touches: [{ clientX: 200, clientY: 200 }],
    });
    fireEvent.touchMove(surface, {
      touches: [{ clientX: 50, clientY: 200 }],
    });
    fireEvent.touchEnd(surface, {
      changedTouches: [{ clientX: 50, clientY: 200 }],
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("swallows the click that follows a horizontal swipe", () => {
    const onClick = vi.fn();
    render(<Harness onClick={onClick} />);

    const surface = screen.getByTestId("surface");
    swipe(surface, 200, 100);
    fireEvent.click(surface);

    expect(onClick).not.toHaveBeenCalled();
  });

  it("lets a plain tap through", () => {
    const onClick = vi.fn();
    render(<Harness onClick={onClick} />);

    const surface = screen.getByTestId("surface");
    fireEvent.touchStart(surface, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(surface, {
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.click(surface);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("only follows a single-finger gesture", () => {
    const onSwipeLeft = vi.fn();
    render(<Harness onSwipeLeft={onSwipeLeft} />);

    const surface = screen.getByTestId("surface");
    fireEvent.touchStart(surface, {
      touches: [
        { clientX: 200, clientY: 100 },
        { clientX: 220, clientY: 120 },
      ],
    });
    fireEvent.touchEnd(surface, {
      changedTouches: [{ clientX: 50, clientY: 100 }],
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });
});
