import {
  Apple,
  Bed,
  Beef,
  Beer,
  BookOpen,
  Brain,
  Cigarette,
  Coffee,
  Droplets,
  Dumbbell,
  Footprints,
  Heart,
  Monitor,
  Moon,
  Music,
  Pencil,
  Pizza,
  Smartphone,
  Sun,
  Timer,
  Trophy,
  Weight,
  Wine,
  type LucideIcon,
} from "lucide-react"

export const curatedIcons: { name: string; Icon: LucideIcon }[] = [
  { name: "Sun", Icon: Sun },
  { name: "Moon", Icon: Moon },
  { name: "Coffee", Icon: Coffee },
  { name: "Droplets", Icon: Droplets },
  { name: "Dumbbell", Icon: Dumbbell },
  { name: "BookOpen", Icon: BookOpen },
  { name: "Brain", Icon: Brain },
  { name: "Bed", Icon: Bed },
  { name: "Apple", Icon: Apple },
  { name: "Footprints", Icon: Footprints },
  { name: "Heart", Icon: Heart },
  { name: "Trophy", Icon: Trophy },
  { name: "Monitor", Icon: Monitor },
  { name: "Smartphone", Icon: Smartphone },
  { name: "Cigarette", Icon: Cigarette },
  { name: "Beer", Icon: Beer },
  { name: "Wine", Icon: Wine },
  { name: "Pizza", Icon: Pizza },
  { name: "Beef", Icon: Beef },
  { name: "Music", Icon: Music },
  { name: "Timer", Icon: Timer },
  { name: "Weight", Icon: Weight },
  { name: "Pencil", Icon: Pencil },
]

export const iconMap = Object.fromEntries(
  curatedIcons.map(({ name, Icon }) => [name, Icon])
)

export function getIcon(name: string): LucideIcon {
  return iconMap[name] ?? Trophy
}