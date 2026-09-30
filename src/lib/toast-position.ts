export type ToastPosition = "top-center" | "bottom-center";

const MOBILE_MAX_WIDTH = 600;

/**
 * Places the toast on the opposite half of the screen from the habit card
 * that was just tapped, so the confirmation never covers the card itself.
 * Habits in the upper zone get a bottom toast; habits in the lower zone get
 * a top toast. Only applies on mobile (< 600px); wider viewports keep the
 * default bottom toast.
 */
export function getToastPosition(element: HTMLElement): ToastPosition {
  if (window.innerWidth >= MOBILE_MAX_WIDTH) {
    return "bottom-center";
  }
  const { top, height } = element.getBoundingClientRect();
  const centerY = top + height / 2;
  return centerY < window.innerHeight / 2 ? "bottom-center" : "top-center";
}
