import { useMemo } from "react";
import { curatedIcons } from "../lib/icons.ts";

const COLS = 12;
const ROWS = 24;
const TOTAL = COLS * ROWS;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16_807) % 2_147_483_647;
    return (s - 1) / 2_147_483_646;
  };
}

export function BackgroundPattern() {
  const cells = useMemo(() => {
    const rng = seededRandom(42);
    const result: {
      iconIndex: number;
      rotate: number;
      x: number;
      y: number;
    }[] = [];
    for (let i = 0; i < TOTAL; i++) {
      const iconIndex = Math.floor(rng() * curatedIcons.length);
      const rotate = (rng() - 0.5) * 40;
      const x = rng() * 4 - 2;
      const y = rng() * 4 - 2;
      result.push({ iconIndex, rotate, x, y });
    }
    return result;
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="h-full w-full"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
      >
        {cells.map(({ iconIndex, rotate, x, y }, i) => {
          const { Icon } = curatedIcons[iconIndex];
          return (
            <div
              className="flex items-center justify-center"
              key={i}
              style={{ opacity: 0.06 }}
            >
              <Icon
                className="h-4 w-4 text-foreground"
                style={{
                  transform: `rotate(${rotate}deg) translate(${x}px, ${y}px)`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
