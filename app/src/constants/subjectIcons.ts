import {
  Atom,
  BookOpen,
  Brain,
  Briefcase,
  Calculator,
  Code,
  Dna,
  Dumbbell,
  FlaskConical,
  Globe,
  GraduationCap,
  Landmark,
  Languages,
  LucideIcon,
  Microscope,
  Music,
  Palette,
  PenTool,
  PencilRuler,
  Trophy,
  Puzzle,
} from "lucide-react-native";

export const SUBJECT_ICONS = [
  "book-open",
  "calculator",
  "flask-conical",
  "atom",
  "dna",
  "languages",
  "landmark",
  "music",
  "palette",
  "dumbbell",
  "code",
  "globe",
  "pen-tool",
  "brain",
  "graduation-cap",
  "microscope",
  "pencil-ruler",
  "briefcase",
  "trophy",
  "puzzle",
] as const;

export type SubjectIconName = (typeof SUBJECT_ICONS)[number];

const iconByName: Record<SubjectIconName, LucideIcon> = {
  "book-open": BookOpen,
  calculator: Calculator,
  "flask-conical": FlaskConical,
  atom: Atom,
  dna: Dna,
  languages: Languages,
  landmark: Landmark,
  music: Music,
  palette: Palette,
  dumbbell: Dumbbell,
  code: Code,
  globe: Globe,
  "pen-tool": PenTool,
  brain: Brain,
  "graduation-cap": GraduationCap,
  microscope: Microscope,
  "pencil-ruler": PencilRuler,
  briefcase: Briefcase,
  trophy: Trophy,
  puzzle: Puzzle,
};

export function subjectIcon(name: string): LucideIcon {
  return iconByName[name as SubjectIconName] ?? BookOpen;
}

const SUBJECT_LABELS: Record<string, string> = {
  math: "Math",
  science: "Science",
  language: "Language",
  programming: "Programming",
  reading: "Reading",
  writing: "Writing",
  history: "History",
  music: "Music",
  art: "Art",
  "test-prep": "Test Prep",
  other: "Other",
};

export function subjectLabel(name: string): string {
  return SUBJECT_LABELS[name] ?? name;
}
