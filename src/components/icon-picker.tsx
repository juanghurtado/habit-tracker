import { curatedIcons } from "../lib/icons"

interface IconPickerProps {
  selected: string
  onSelect: (name: string) => void
}

export function IconPicker({ selected, onSelect }: IconPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {curatedIcons.map(({ name, Icon }) => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          className={`flex items-center justify-center rounded-xl p-3 transition-all duration-150 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            selected === name
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hoverable:hover:bg-muted/80"
          }`}
        >
          <Icon className="size-6" />
        </button>
      ))}
    </div>
  )
}