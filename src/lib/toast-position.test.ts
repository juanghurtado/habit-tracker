import { afterEach, describe, expect, it, vi } from "vitest";
import { getToastPosition } from "./toast-position.ts";

function elementWithRect(top: number, height: number): HTMLElement {
  const element = document.createElement("button");
  element.getBoundingClientRect = () =>
    ({
      top,
      height,
      bottom: top + height,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
  return element;
}

describe("getToastPosition", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns bottom-center when the habit sits in the upper zone", () => {
    vi.stubGlobal("innerWidth", 400);
    vi.stubGlobal("innerHeight", 800);
    expect(getToastPosition(elementWithRect(0, 200))).toBe("bottom-center");
  });

  it("returns top-center when the habit sits in the lower zone", () => {
    vi.stubGlobal("innerWidth", 400);
    vi.stubGlobal("innerHeight", 800);
    expect(getToastPosition(elementWithRect(600, 200))).toBe("top-center");
  });

  it("returns top-center when the habit center is exactly at the midpoint", () => {
    vi.stubGlobal("innerWidth", 400);
    vi.stubGlobal("innerHeight", 800);
    expect(getToastPosition(elementWithRect(300, 200))).toBe("top-center");
  });

  it("keeps bottom-center on wider viewports regardless of habit position", () => {
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 800);
    expect(getToastPosition(elementWithRect(700, 200))).toBe("bottom-center");
  });
});
