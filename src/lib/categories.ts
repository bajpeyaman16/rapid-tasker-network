import {
  Zap, Wrench, Hammer, Paintbrush, Layers, Flame, Sparkles, Car,
  Trees, Home, Wind, Cog, HardHat, MoreHorizontal, type LucideIcon,
} from "lucide-react";

export type Category = {
  slug: string;
  name: string;
  icon: LucideIcon;
  tint: "green" | "blue";
};

export const CATEGORIES: Category[] = [
  { slug: "electrician", name: "Electrician", icon: Zap, tint: "green" },
  { slug: "plumber", name: "Plumber", icon: Wrench, tint: "blue" },
  { slug: "carpenter", name: "Carpenter", icon: Hammer, tint: "green" },
  { slug: "painter", name: "Painter", icon: Paintbrush, tint: "blue" },
  { slug: "mason", name: "Mason", icon: Layers, tint: "green" },
  { slug: "welder", name: "Welder", icon: Flame, tint: "blue" },
  { slug: "cleaner", name: "Cleaner", icon: Sparkles, tint: "green" },
  { slug: "driver", name: "Driver", icon: Car, tint: "blue" },
  { slug: "gardener", name: "Gardener", icon: Trees, tint: "green" },
  { slug: "house-maid", name: "House Maid", icon: Home, tint: "blue" },
  { slug: "ac-repair", name: "AC Repair", icon: Wind, tint: "green" },
  { slug: "mechanic", name: "Mechanic", icon: Cog, tint: "blue" },
  { slug: "construction-labour", name: "Construction", icon: HardHat, tint: "green" },
  { slug: "others", name: "Others", icon: MoreHorizontal, tint: "blue" },
];

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);
