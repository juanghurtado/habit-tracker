import { allColors } from "../lib/colors.ts";

interface ColorPickerProps {
  onSelect: (color: string) => void;
  selected: string;
  type: "good" | "bad";
}

export function ColorPicker({ type, selected, onSelect }: ColorPickerProps) {
  const colors = allColors[type];

  return (
    <div className="grid grid-cols-6 gap-2">
      {colors.map((c) => (
        <button
          className={`flex size-9 items-center justify-center rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 ${
            selected === c.value
              ? "ring-2 ring-ring ring-offset-2 ring-offset-bg"
              : "hoverable:hover:scale-110"
          }`}
          key={c.value}
          onClick={() => onSelect(c.value)}
          style={{ backgroundColor: c.value }}
          title={c.name}
        >
          {selected === c.value && (
            <svg
              className="size-4 text-white drop-shadow-sm"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              viewBox="0 0 24 24"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}
