import {
  CalendarCheck,
  Clock,
  Flame,
  Globe,
  LucideIcon,
  Moon,
  Trophy,
  Zap,
} from "lucide-react-native";

const iconByCode: Record<string, LucideIcon> = {
  first_session: Zap,
  streak_3: Flame,
  streak_7: Flame,
  streak_30: Flame,
  total_10h: Clock,
  total_50h: Clock,
  total_100h: Trophy,
  week_10h: CalendarCheck,
  night_owl: Moon,
  all_subjects: Globe,
};

export function achievementIcon(code: string): LucideIcon {
  return iconByCode[code] ?? Trophy;
}
