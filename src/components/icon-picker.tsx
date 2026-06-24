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
          className={`flex items-center justify-center rounded-xl p-3 transition-all active:scale-90 ${
            selected === name
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Icon className="size-6" />
        </button>
      ))}
    </div>
  )
}