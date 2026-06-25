import { allColors } from "../lib/colors"

interface ColorPickerProps {
  type: "good" | "bad"
  selected: string
  onSelect: (color: string) => void
}

export function ColorPicker({ type, selected, onSelect }: ColorPickerProps) {
  const colors = allColors[type]

  return (
    <div className="grid grid-cols-6 gap-2">
      {colors.map((c) => (
        <button
          key={c.value}
          onClick={() => onSelect(c.value)}
          className={`flex size-9 items-center justify-center rounded-xl transition-all duration-150 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            selected === c.value
              ? "ring-2 ring-ring ring-offset-2 ring-offset-bg"
              : "hoverable:hover:scale-110"
          }`}
          style={{ backgroundColor: c.value }}
          title={c.name}
        >
          {selected === c.value && (
            <svg
              viewBox="0 0 24 24"
              className="size-4 text-white drop-shadow-sm"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}