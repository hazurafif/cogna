# Cogna app (Expo)

The React Native / Expo client for Cogna: home timeline, study timer, manual
logging, session detail and profile stats.

## Stack

- **UI:** [BNA UI](https://ui.ahmedbna.com) — components live as source in
  `src/components/ui/` (installed with `npx bna-ui add …`), themed through
  `src/theme/colors.ts` and `src/hooks/useColor`. Light/dark/system mode comes
  from `src/providers/mode-provider.tsx`, mounted app-wide by
  `src/providers/theme-provider.tsx` in `src/app/_layout.tsx`.
- **Navigation:** Expo Router (tabs + auth/session stacks).
- **Styling:** BNA design tokens (`src/theme/globals.ts`) plus the app's own
  layout tokens (`src/theme/tokens.ts`).

## Get started

1. Install dependencies

   ```bash
   pnpm install
   ```

2. Start the app

   ```bash
   pnpm start
   ```

   Press `w` for web, `i` for iOS simulator. `pnpm start` reads `backend/.env`
   and passes its `PORT` to the app as `EXPO_PUBLIC_API_PORT`.

## Adding BNA UI components

```bash
npx bna-ui add <component>   # e.g. npx bna-ui add bottom-sheet
npx bna-ui list              # browse the registry
```

The CLI writes into `src/components/ui/` (the `@/*` alias maps to `src/*`) and
brings any theme files, hooks and npm dependencies the component needs.

## Tests

```bash
pnpm test                     # unit tests
pnpm exec jest --coverage     # coverage gate ≥ 80%
```
