import { curatedIcons } from "../lib/icons.ts";

interface IconPickerProps {
  onSelect: (name: string) => void;
  selected: string;
}

export function IconPicker({ selected, onSelect }: IconPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {curatedIcons.map(({ name, Icon }) => (
        <button
          className={`flex items-center justify-center rounded-xl p-3 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 ${
            selected === name
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hoverable:hover:bg-muted/80"
          }`}
          key={name}
          onClick={() => onSelect(name)}
        >
          <Icon className="size-6" />
        </button>
      ))}
    </div>
  );
}
