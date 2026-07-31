# Cogna Dark UI — Design Spec

Date: 2026-08-01
Status: Approved

## Purpose

Replace the current default Expo look (hardcoded hex colors, default chrome) with a cohesive dark design system inspired by Strava's energy: near-black surfaces, vivid orange primary, iconography, and consistent spacing/typography. Dark theme only — no light mode, no toggle.

## Design Decisions

- **Direction** — "Strava Energy": dark first, high contrast, bold numerals.
- **Dark only** — single theme; no theme context, colors are plain TS constants.
- **Icons** — `Ionicons` outline set via `@expo/vector-icons` (bundled with Expo, zero extra install).
- **Typography** — system fonts; tabular numerals for timers/stats; weight-based hierarchy.
- **Coverage/test convention** — every new shared component ships with RNTL v14 tests; existing screen tests updated where labels/IDs change; theme module is data (smoke-tested).

## Design System

### Colors (`src/theme/colors.ts`)

| Token | Value | Usage |
|---|---|---|
| `bg` | `#0F1115` | app background, tab bar |
| `surface` | `#1A1D24` | cards, inputs, chips, icon chips |
| `border` | `#262B35` | hairline borders, dividers |
| `primary` | `#FC4C02` | CTAs, active states, selected chips, streak card |
| `text` | `#E5E7EB` | primary text |
| `textSecondary` | `#9CA3AF` | labels, meta |
| `textMuted` | `#6B7280` | tab labels (inactive), hints |
| `danger` | `#F87171` | delete/destructive actions, errors |
| `subjects` | `#FC4C02`, `#22C55E`, `#38BDF8`, `#8B5CF6`, `#F59E0B`, `#F43F5E` | subject dots/chips (new palette defaults) |

### Radii & spacing (`src/theme/tokens.ts`)

- Radius: `sm 10` (inputs), `md 14` (cards), `full 999` (pills, buttons)
- Spacing: 4pt scale — `xs 4`, `sm 8`, `md 12`, `lg 16`, `xl 24`
- Font sizes: `label 10` (uppercase card labels), `caption 12`, `body 14`, `title 16`, `heading 24`, `hero 44` (timer)
- Timer/stats values use `fontVariant: ["tabular-nums"]`

### Icons (Ionicons outline)

- Tab bar: `home-outline`, `stopwatch-outline`, `time-outline`, `pricetag-outline`
- Stat cards: `time-outline` (all time), `calendar-outline` (week), `flame-outline` (streak)
- History rows: `time-outline` tinted with subject color
- Header: `sync-outline` (home top-right refresh affordance), `add-outline` ("Log manually"), `log-out-outline` (logout)
- Subjects: `add-outline` (add), `trash-outline` (delete)

## Shared Components (`src/components/`)

- `Button` — variants `primary` (orange fill), `outline` (surface + border + text), `danger` (red fill, white text); props: `title`, `onPress`, `disabled`, `loading` (label swap), `variant`; pill radius, centered label.
- `Card` — `surface` bg, radius `md`, padding `lg`.
- `Chip` — pill; props `label`, `selected`, `onPress`; selected = `primary` fill + white text, else surface + border + secondary text.
- `StatCard` — props `icon`, `value`, `label`; icon tinted `primary` except streak card (primary fill, white text, white icon).
- `Screen` — wrapper: `bg` background, padding `lg`, optional `title` header row (heading style).
- `SubjectDot` — props `color`, `size?`.

All components typed with interfaces, function components, exported for reuse and tests.

## Screen Changes

- **Login/Register** — `Screen` bg, "Cogna" heading, form inputs (surface, radius `sm`, text), primary `Button`, error text in `danger`, link row for switching auth mode.
- **Home** — greeting (textSecondary) + `sync-outline` icon; 3 `StatCard`s; "By subject" section with `SubjectDot` + name + minutes; ghost logout row (`log-out-outline` icon + `outline` `Button` "Log out").
- **Timer** — subject `Chip`s; hero elapsed `00:00:00` (tabular, `hero` size); start = primary `Button` (pill), stop = `Button` variant `danger` fill (solid red, white text); "Add a subject first" hint in `textMuted`.
- **History** — header row "History" + `add-outline` "Log manually"; rows: 34px icon chip (surface bg, `time-outline` tinted subject color) + name/meta + right-aligned bold duration; hairline dividers.
- **Session detail** — subject dot + name, `hero`-ish duration (`heading`), meta lines (`textSecondary`), note, outline `Button` "Edit", `danger` `Button` "Delete".
- **Subjects** — form `Card` (input + palette swatches + add `Button`), swatch selected = 3px `text` border; list rows with `SubjectDot` + `trash-outline` delete.
- **New/Edit session** — `Chip`s, dark inputs, primary `Button` "Save session", title switches Edit/Log.
- **Chrome** — root `_layout.tsx` background `bg`; `expo-status-bar` style light; `Tabs` options: `tabBarStyle` bg + hairline top border, `tabBarActiveTintColor` primary, inactive `textMuted`, `tabBarIcon` per tab.

## Out of Scope

- Light mode / theme toggle (dark only)
- Custom fonts (system fonts)
- New screens or features; subject colors already saved server-side remain as stored (only the palette picker defaults change)

## Testing

- New: component tests for `Button` (variants, disabled, loading), `Chip` (select toggle), `StatCard` (renders value/label/icon), `Screen` (title), `SubjectDot` (color prop).
- Updated: screen tests keep existing behavior assertions; new/renamed labels or testIDs reflected where styling changed them.
- Theme module: one smoke test asserting every screen's color references resolve to tokens (no raw hex left in `src/screens`).
- Gates unchanged: `pnpm test` ≥ 80% coverage on new/changed code, `npx tsc --noEmit`, `pnpm lint`.

## Files

- Create: `app/src/theme/colors.ts`, `app/src/theme/tokens.ts`, `app/src/components/{Button,Card,Chip,StatCard,Screen,SubjectDot}.tsx` + `.test.tsx` each
- Modify: all screens in `app/src/screens/`, `app/src/app/_layout.tsx`, `app/src/app/(tabs)/_layout.tsx`
