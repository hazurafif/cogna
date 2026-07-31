# Cogna Dark UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the entire Cogna app with a cohesive dark design system ("Strava Energy": near-black surfaces, vivid orange primary, Ionicons, consistent spacing/typography).

**Architecture:** Theme as plain TS modules (`src/theme/colors.ts`, `src/theme/tokens.ts`) — dark-only, no context. Six shared components in `src/components/` (Button, Card, Chip, Screen, StatCard, SubjectDot), each tested. All screens and chrome (root layout, tab bar) consume the tokens; every hardcoded hex leaves the screens. Screen tests updated where labels/IDs change; a final smoke test asserts no raw hex remains in app source.

**Tech Stack:** React Native (Expo SDK 57), TypeScript strict, `@expo/vector-icons` (Ionicons, bundled), RNTL v14 (async APIs — `await render/fireEvent`), jest-expo. Package manager: pnpm.

**Reference spec:** `docs/superpowers/specs/2026-08-01-cogna-dark-ui-design.md`

**Repo facts:** routes live under `app/src/app/` (SDK 57 layout). All app commands run from `app/` with pnpm; test = `pnpm test`, typecheck = `npx tsc --noEmit`, lint = `pnpm lint`. Existing tests use RNTL v14 async style and the expo-router `useFocusEffect`-as-`useEffect` mock convention. `Button` supports an optional `testID` prop (some screen tests target `start-button`/`stop-button`).

---

### Task 1: Theme tokens

**Files:**
- Create: `app/src/theme/colors.ts`
- Create: `app/src/theme/tokens.ts`
- Create: `app/src/theme/theme.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/src/theme/theme.test.ts`:

```ts
import { colors } from "./colors";
import { fontSize, radius, spacing } from "./tokens";

describe("theme tokens", () => {
  it("defines the dark palette exactly", () => {
    expect(colors.bg).toBe("#0F1115");
    expect(colors.surface).toBe("#1A1D24");
    expect(colors.border).toBe("#262B35");
    expect(colors.primary).toBe("#FC4C02");
    expect(colors.text).toBe("#E5E7EB");
    expect(colors.textSecondary).toBe("#9CA3AF");
    expect(colors.textMuted).toBe("#6B7280");
    expect(colors.danger).toBe("#F87171");
  });

  it("defines six subject accents", () => {
    expect(colors.subjects).toEqual([
      "#FC4C02", "#22C55E", "#38BDF8", "#8B5CF6", "#F59E0B", "#F43F5E",
    ]);
  });

  it("defines radii, spacing and font sizes", () => {
    expect(radius).toEqual({ sm: 10, md: 14, full: 999 });
    expect(spacing).toEqual({ xs: 4, sm: 8, md: 12, lg: 16, xl: 24 });
    expect(fontSize).toEqual({
      label: 10, caption: 12, body: 14, title: 16, heading: 24, hero: 44,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/theme/theme.test.ts`
Expected: FAIL — `Cannot find module './colors'`

- [ ] **Step 3: Implement the theme modules**

Create `app/src/theme/colors.ts`:

```ts
export const colors = {
  bg: "#0F1115",
  surface: "#1A1D24",
  border: "#262B35",
  primary: "#FC4C02",
  text: "#E5E7EB",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  danger: "#F87171",
  subjects: ["#FC4C02", "#22C55E", "#38BDF8", "#8B5CF6", "#F59E0B", "#F43F5E"] as const,
} as const;
```

Create `app/src/theme/tokens.ts`:

```ts
export const radius = {
  sm: 10,
  md: 14,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const fontSize = {
  label: 10,
  caption: 12,
  body: 14,
  title: 16,
  heading: 24,
  hero: 44,
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/theme/theme.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Verify and commit**

Run: `npx tsc --noEmit && pnpm lint && pnpm test`
Expected: clean.

```bash
git add app/src/theme
git commit -m "feat(app): add dark theme tokens"
```

---

### Task 2: Button component

**Files:**
- Create: `app/src/components/Button.tsx`
- Create: `app/src/components/Button.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/src/components/Button.test.tsx`:

```tsx
import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Button } from "./Button";

describe("Button", () => {
  it("renders the title and fires onPress", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button title="Save" onPress={onPress} />);
    await fireEvent.press(getByText("Save"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled or loading", async () => {
    const onPress = jest.fn();
    const { getByTestId, rerender } = await render(
      <Button title="Save" onPress={onPress} disabled />,
    );
    await fireEvent.press(getByTestId("button"));
    expect(onPress).not.toHaveBeenCalled();

    await rerender(<Button title="Save" onPress={onPress} loading />);
    await fireEvent.press(getByTestId("button"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("shows a spinner while loading", async () => {
    const { getByTestId } = await render(
      <Button title="Save" onPress={jest.fn()} loading />,
    );
    expect(getByTestId("button-loading")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/Button.test.tsx`
Expected: FAIL — `Cannot find module './Button'`

- [ ] **Step 3: Implement the Button**

Create `app/src/components/Button.tsx`:

```tsx
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";
import { fontSize, radius } from "../theme/tokens";

export type ButtonVariant = "primary" | "outline" | "danger";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
};

const variantStyles = {
  primary: { backgroundColor: colors.primary },
  outline: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  danger: { backgroundColor: "#DC2626" },
} as const;

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  testID,
}: ButtonProps) {
  const blocked = disabled || loading;
  return (
    <Pressable
      testID={testID ?? "button"}
      onPress={onPress}
      disabled={blocked}
      accessibilityState={{ disabled: blocked }}
      style={[styles.base, variantStyles[variant], blocked && styles.blocked]}
    >
      {loading ? (
        <ActivityIndicator
          testID="button-loading"
          color={variant === "outline" ? colors.primary : "#fff"}
        />
      ) : (
        <Text style={[styles.label, variant === "outline" && styles.outlineLabel]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  blocked: { opacity: 0.5 },
  label: { color: "#fff", fontSize: fontSize.title, fontWeight: "600" },
  outlineLabel: { color: colors.text },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/Button.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Verify and commit**

Run: `npx tsc --noEmit && pnpm lint && pnpm test`
Expected: clean.

```bash
git add app/src/components
git commit -m "feat(app): add themed Button component"
```

---

### Task 3: Chip and SubjectDot components

**Files:**
- Create: `app/src/components/Chip.tsx`
- Create: `app/src/components/Chip.test.tsx`
- Create: `app/src/components/SubjectDot.tsx`
- Create: `app/src/components/SubjectDot.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `app/src/components/Chip.test.tsx`:

```tsx
import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("renders the label and calls onPress", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Chip label="Math" onPress={onPress} />);
    await fireEvent.press(getByText("Math"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("applies selected state", async () => {
    const { getByText } = await render(<Chip label="Math" selected />);
    const text = getByText("Math");
    expect(text.props.style).toEqual(
      expect.objectContaining({ color: "#FFFFFF" }),
    );
  });
});
```

Create `app/src/components/SubjectDot.test.tsx`:

```tsx
import React from "react";
import { render } from "@testing-library/react-native";
import { SubjectDot } from "./SubjectDot";

describe("SubjectDot", () => {
  it("renders a colored dot", async () => {
    const { getByTestId } = await render(<SubjectDot color="#22C55E" />);
    const dot = getByTestId("subject-dot");
    expect(dot.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: "#22C55E" })]),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/components/Chip.test.tsx src/components/SubjectDot.test.tsx`
Expected: FAIL — `Cannot find module './Chip'` / `'./SubjectDot'`

- [ ] **Step 3: Implement Chip**

Create `app/src/components/Chip.tsx`:

```tsx
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";
import { fontSize, radius } from "../theme/tokens";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.base, selected && styles.selected]}
      accessibilityState={{ selected: !!selected }}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { color: colors.textSecondary, fontSize: fontSize.body },
  labelSelected: { color: "#FFFFFF", fontWeight: "600" },
});
```

- [ ] **Step 4: Implement SubjectDot**

Create `app/src/components/SubjectDot.tsx`:

```tsx
import React from "react";
import { StyleSheet, View } from "react-native";

type SubjectDotProps = {
  color: string;
  size?: number;
};

export function SubjectDot({ color, size = 10 }: SubjectDotProps) {
  return (
    <View
      testID="subject-dot"
      style={[styles.dot, { backgroundColor: color, width: size, height: size, borderRadius: size / 2 }]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {},
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/components/Chip.test.tsx src/components/SubjectDot.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit && pnpm lint && pnpm test`
Expected: clean.

```bash
git add app/src/components
git commit -m "feat(app): add Chip and SubjectDot components"
```

---

### Task 4: Card and Screen components

**Files:**
- Create: `app/src/components/Card.tsx`
- Create: `app/src/components/Card.test.tsx`
- Create: `app/src/components/Screen.tsx`
- Create: `app/src/components/Screen.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `app/src/components/Card.test.tsx`:

```tsx
import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { Card } from "./Card";

describe("Card", () => {
  it("renders children", async () => {
    const { getByText } = await render(<Card><Text>content</Text></Card>);
    expect(getByText("content")).toBeTruthy();
  });
});
```

Create `app/src/components/Screen.test.tsx`:

```tsx
import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { Screen } from "./Screen";

describe("Screen", () => {
  it("renders children and an optional title", async () => {
    const { getByText } = await render(
      <Screen title="Subjects"><Text>body</Text></Screen>,
    );
    expect(getByText("Subjects")).toBeTruthy();
    expect(getByText("body")).toBeTruthy();
  });

  it("renders without a title", async () => {
    const { getByText } = await render(<Screen><Text>body</Text></Screen>);
    expect(getByText("body")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/components/Card.test.tsx src/components/Screen.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement Card**

Create `app/src/components/Card.tsx`:

```tsx
import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/tokens";

type CardProps = {
  children: React.ReactNode;
};

export function Card({ children }: CardProps) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
});
```

- [ ] **Step 4: Implement Screen**

Create `app/src/components/Screen.tsx`:

```tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { fontSize, spacing } from "../theme/tokens";

type ScreenProps = {
  title?: string;
  children: React.ReactNode;
};

export function Screen({ title, children }: ScreenProps) {
  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { fontSize: fontSize.heading, fontWeight: "700", color: colors.text },
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/components/Card.test.tsx src/components/Screen.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit && pnpm lint && pnpm test`
Expected: clean.

```bash
git add app/src/components
git commit -m "feat(app): add Card and Screen components"
```

---

### Task 5: StatCard component

**Files:**
- Create: `app/src/components/StatCard.tsx`
- Create: `app/src/components/StatCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/src/components/StatCard.test.tsx`:

```tsx
import React from "react";
import { render } from "@testing-library/react-native";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders value and label", async () => {
    const { getByText } = await render(
      <StatCard icon="time-outline" value="15h 20m" label="ALL TIME" />,
    );
    expect(getByText("15h 20m")).toBeTruthy();
    expect(getByText("ALL TIME")).toBeTruthy();
  });

  it("applies the highlighted style for the streak card", async () => {
    const { getByTestId } = await render(
      <StatCard icon="flame-outline" value="6 days" label="STREAK" highlighted />,
    );
    expect(getByTestId("stat-card")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/StatCard.test.tsx`
Expected: FAIL — `Cannot find module './StatCard'`

- [ ] **Step 3: Implement StatCard**

Create `app/src/components/StatCard.tsx`:

```tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { fontSize, radius, spacing } from "../theme/tokens";

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  highlighted?: boolean;
};

export function StatCard({ icon, value, label, highlighted }: StatCardProps) {
  const tint = highlighted ? "#FFFFFF" : colors.primary;
  return (
    <View testID="stat-card" style={[styles.card, highlighted && styles.highlighted]}>
      <Ionicons name={icon} size={14} color={tint} />
      <Text style={[styles.value, highlighted && styles.valueHighlighted]}>{value}</Text>
      <Text style={[styles.label, highlighted && styles.labelHighlighted]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  highlighted: { backgroundColor: colors.primary },
  value: {
    fontSize: fontSize.title,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  valueHighlighted: { color: "#FFFFFF" },
  label: { fontSize: fontSize.label, color: colors.textSecondary },
  labelHighlighted: { color: "#FFFFFF", opacity: 0.85 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/StatCard.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Verify and commit**

Run: `npx tsc --noEmit && pnpm lint && pnpm test`
Expected: clean.

```bash
git add app/src/components
git commit -m "feat(app): add StatCard component"
```

---

### Task 6: Chrome — root layout, tab bar, status bar

**Files:**
- Modify: `app/src/app/_layout.tsx`
- Modify: `app/src/app/(tabs)/_layout.tsx`
- Modify: `docs/decisions.md`

- [ ] **Step 1: Restyle the root layout**

Replace `app/src/app/_layout.tsx` with:

```tsx
import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../src/auth/AuthContext";
import { colors } from "../src/theme/colors";

function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Protected guard={!!token}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="session/[id]" />
          <Stack.Screen name="session/new" />
          <Stack.Screen name="session/[id]/edit" />
        </Stack.Protected>
        <Stack.Protected guard={!token}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
```

(Path: `_layout.tsx` is at `app/src/app/_layout.tsx`; imports of AuthContext/theme use `../src/...` from there — verify the actual relative paths and adjust if needed.)

- [ ] **Step 2: Restyle the tab bar**

Replace `app/src/app/(tabs)/_layout.tsx` with:

```tsx
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/theme/colors";

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IoniconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home-outline") }} />
      <Tabs.Screen name="timer" options={{ title: "Timer", tabBarIcon: tabIcon("stopwatch-outline") }} />
      <Tabs.Screen name="history" options={{ title: "History", tabBarIcon: tabIcon("time-outline") }} />
      <Tabs.Screen name="subjects" options={{ title: "Subjects", tabBarIcon: tabIcon("pricetag-outline") }} />
    </Tabs>
  );
}
```

(Path: from `app/src/app/(tabs)/_layout.tsx` the theme is at `../../src/theme/colors`. Verify.)

- [ ] **Step 3: Record the decision**

Append to `docs/decisions.md` under a new `## 2026-08-01` entry (or the existing one):

```markdown
- **Dark UI theme** — the app is dark-only ("Strava Energy"): bg #0F1115, surface #1A1D24, primary #FC4C02, Ionicons outline icons. Design per `docs/superpowers/specs/2026-08-01-cogna-dark-ui-design.md`.
```

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit && pnpm lint && pnpm test` from `app/`
Expected: clean.

```bash
git add app/src/app docs/decisions.md
git commit -m "feat(app): apply dark theme to app chrome"
```

---

### Task 7: Login and Register screens

**Files:**
- Modify: `app/src/screens/LoginScreen.tsx`
- Modify: `app/src/screens/RegisterScreen.tsx`
- Modify: `app/src/screens/LoginScreen.test.tsx` (if needed)

- [ ] **Step 1: Restyle LoginScreen**

Replace `app/src/screens/LoginScreen.tsx` with:

```tsx
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
import { fontSize, radius, spacing } from "../theme/tokens";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch {
      setError("Could not log in. Check your email and password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.center}>
        <Text style={styles.title}>Cogna</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          testID="email-input"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          testID="password-input"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Log in" onPress={onSubmit} loading={submitting} />
        <Link href="/register" style={styles.link}>
          <Text style={styles.linkText}>No account? Register</Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", gap: spacing.md },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: fontSize.body,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: fontSize.body },
  link: { alignItems: "center", marginTop: spacing.sm },
  linkText: { color: colors.textSecondary, fontSize: fontSize.body },
});
```

- [ ] **Step 2: Restyle RegisterScreen**

Replace `app/src/screens/RegisterScreen.tsx` with the same structure (title "Create account", placeholder "Password (min 8 characters)", error "Could not register. The email may already be in use.", Button "Register", link "Already have an account? Log in", identical styles).

- [ ] **Step 3: Run screen tests**

Run: `pnpm test src/screens/LoginScreen.test.tsx src/screens/RegisterScreen.test.tsx`
Expected: PASS — existing tests assert placeholders/button labels, all preserved. If any fail (e.g. text color assertions), fix the test to match the new theme.

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit && pnpm lint && pnpm test`
Expected: clean.

```bash
git add app/src/screens
git commit -m "feat(app): theme login and register screens"
```

---

### Task 8: Home screen

**Files:**
- Modify: `app/src/screens/HomeScreen.tsx`
- Modify: `app/src/screens/HomeScreen.test.tsx` (if needed)

- [ ] **Step 1: Restyle HomeScreen**

Replace `app/src/screens/HomeScreen.tsx` with:

```tsx
import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { fetchSummary, Summary } from "../api/stats";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { StatCard } from "../components/StatCard";
import { SubjectDot } from "../components/SubjectDot";
import { colors } from "../theme/colors";
import { fontSize, spacing } from "../theme/tokens";
import { formatDuration, formatMinutes } from "../utils/time";

export function HomeScreen() {
  const { token, user, logout } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setSummary(await fetchSummary(token));
      setError(null);
    } catch {
      setError("Could not load stats. Is the backend running?");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <Screen>
      <View style={styles.topRow}>
        <Text style={styles.greeting}>Hi, {user?.email ?? "there"}</Text>
        <Ionicons name="sync-outline" size={20} color={colors.textMuted} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {summary ? (
        <>
          <View style={styles.cardRow}>
            <StatCard icon="time-outline" value={formatDuration(summary.total_minutes)} label="ALL TIME" />
            <StatCard icon="calendar-outline" value={formatDuration(summary.week_minutes)} label="THIS WEEK" />
            <StatCard icon="flame-outline" value={`${summary.streak_days} days`} label="STREAK" highlighted />
          </View>
          <Text style={styles.sectionTitle}>By subject</Text>
          {summary.per_subject.map((s) => (
            <View key={s.subject_id} style={styles.subjectRow}>
              <SubjectDot color={s.color} />
              <Text style={styles.subjectName}>{s.name}</Text>
              <Text style={styles.subjectMinutes}>{formatMinutes(s.minutes)}</Text>
            </View>
          ))}
          <View style={styles.logoutRow}>
            <Ionicons name="log-out-outline" size={16} color={colors.textSecondary} />
            <Button title="Log out" variant="outline" onPress={() => logout()} testID="logout-button" />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: { fontSize: fontSize.body, fontWeight: "600", color: colors.textSecondary },
  cardRow: { flexDirection: "row", gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.title, fontWeight: "600", color: colors.text, marginTop: spacing.sm },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs + 2,
  },
  subjectName: { flex: 1, fontSize: fontSize.body, color: colors.text },
  subjectMinutes: { fontSize: fontSize.body, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  error: { color: colors.danger, fontSize: fontSize.body },
});
```

- [ ] **Step 2: Update HomeScreen tests**

The existing tests still pass (they assert "2h 30m", "1h 0m", /3 day/i, "Math", error text, and the logout button "Log out"). Add a check for the sync icon? Not needed. Run:

Run: `pnpm test src/screens/HomeScreen.test.tsx`
Expected: PASS. If the logout test presses `getByText("Log out")` it still works (Button renders the label as text).

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit && pnpm lint && pnpm test`
Expected: clean.

```bash
git add app/src/screens
git commit -m "feat(app): theme home dashboard"
```

---

### Task 9: Timer screen

**Files:**
- Modify: `app/src/screens/TimerScreen.tsx`

- [ ] **Step 1: Restyle TimerScreen**

Replace `app/src/screens/TimerScreen.tsx` with:

```tsx
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSubjects, Subject } from "../api/subjects";
import { createSession } from "../api/sessions";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
import { fontSize, spacing } from "../theme/tokens";
import { localISO } from "../utils/time";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(s)}`;
}

export function TimerScreen() {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!token) return;
    listSubjects(token)
      .then(setSubjects)
      .catch(() => setError("Could not load subjects."));
  }, [token]);

  useEffect(() => {
    if (startedAt === null) return;
    intervalRef.current = setInterval(
      () => setElapsed(Date.now() - startedAt),
      1000,
    );
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt]);

  const start = () => {
    if (subjectId === null) return;
    setElapsed(0);
    setStartedAt(Date.now());
  };

  const stop = async () => {
    if (startedAt === null || subjectId === null || !token) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSaving(true);
    setError(null);
    try {
      await createSession(token, {
        subject_id: subjectId,
        started_at: localISO(new Date(startedAt)),
        ended_at: localISO(new Date()),
        source: "timer",
      });
      setStartedAt(null);
      router.push("/(tabs)/history");
    } catch {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(
        () => setElapsed(Date.now() - startedAt),
        1000,
      );
      setError("Could not save session. Try again.");
      setSaving(false);
    }
  };

  return (
    <Screen title="Study timer">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.subjectRow}>
          {subjects.map((s) => (
            <Chip
              key={s.id}
              label={s.name}
              selected={subjectId === s.id}
              onPress={() => setSubjectId(s.id)}
            />
          ))}
        </View>
        {subjects.length === 0 ? (
          <Text style={styles.hint}>Add a subject first (Subjects tab).</Text>
        ) : null}

        {startedAt !== null ? (
          <View style={styles.timerBox}>
            <Ionicons name="stopwatch-outline" size={64} color={colors.primary} />
            <Text style={styles.elapsed} testID="elapsed">
              {formatElapsed(elapsed)}
            </Text>
            <Text style={styles.runningLabel}>
              {subjects.find((s) => s.id === subjectId)?.name ?? ""} · timer running
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            title={startedAt === null ? "Start studying" : "Running…"}
            onPress={start}
            disabled={subjectId === null || startedAt !== null}
            testID="start-button"
          />
          {startedAt !== null ? (
            <Button
              title="Stop and save"
              variant="danger"
              onPress={stop}
              loading={saving}
              testID="stop-button"
            />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  subjectRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  hint: { color: colors.textMuted, fontSize: fontSize.body },
  timerBox: { alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  elapsed: {
    fontSize: fontSize.hero,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  runningLabel: { color: colors.textSecondary, fontSize: fontSize.caption },
  actions: { gap: spacing.md, marginTop: spacing.md },
  error: { color: colors.danger, fontSize: fontSize.body },
});
```

- [ ] **Step 2: Run timer tests**

Run: `pnpm test src/screens/TimerScreen.test.tsx`
Expected: PASS — testIDs `start-button`/`stop-button`/`elapsed` preserved via Button's `testID` prop; "Math" chip label preserved; createSession assertions unchanged.

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit && pnpm lint && pnpm test`
Expected: clean.

```bash
git add app/src/screens
git commit -m "feat(app): theme study timer screen"
```

---

### Task 10: History screen

**Files:**
- Modify: `app/src/screens/HistoryScreen.tsx`
- Modify: `app/src/screens/HistoryScreen.test.tsx` (if needed)

- [ ] **Step 1: Restyle HistoryScreen**

Replace `app/src/screens/HistoryScreen.tsx` with:

```tsx
import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSessions, StudySession } from "../api/sessions";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
import { fontSize, radius, spacing } from "../theme/tokens";
import { formatDuration } from "../utils/time";

function formatDay(startedAt: string): string {
  return startedAt.slice(0, 10);
}

export function HistoryScreen() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setSessions(await listSessions(token));
      setError(null);
    } catch {
      setError("Could not load sessions.");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <Screen title="History">
      <View style={styles.header}>
        <Pressable onPress={() => router.push("/session/new")} style={styles.addLink}>
          <Ionicons name="add-outline" size={16} color={colors.primary} />
          <Text style={styles.addText}>Log manually</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={sessions}
        keyExtractor={(s) => String(s.id)}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/session/${item.id}`)}>
            <View style={styles.iconChip}>
              <Ionicons name="time-outline" size={18} color={item.subject_color} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowName}>{item.subject_name}</Text>
              <Text style={styles.rowMeta}>
                {formatDay(item.started_at)} · {item.source}
              </Text>
            </View>
            <Text style={styles.rowDuration}>{formatDuration(item.duration_minutes)}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },
  addLink: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  addText: { color: colors.primary, fontWeight: "600", fontSize: fontSize.body },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowBody: { flex: 1 },
  rowName: { fontSize: fontSize.body, fontWeight: "600", color: colors.text },
  rowMeta: { fontSize: fontSize.caption, color: colors.textSecondary, marginTop: 2 },
  rowDuration: {
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  error: { color: colors.danger, fontSize: fontSize.body },
});
```

- [ ] **Step 2: Run history tests**

Run: `pnpm test src/screens/HistoryScreen.test.tsx`
Expected: PASS — "Biology"/"1h 0m"/"45m" text and navigation assertions unchanged.

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit && pnpm lint && pnpm test`
Expected: clean.

```bash
git add app/src/screens
git commit -m "feat(app): theme history screen"
```

---

### Task 11: Session detail screen

**Files:**
- Modify: `app/src/screens/SessionDetailScreen.tsx`

- [ ] **Step 1: Restyle SessionDetailScreen**

Replace `app/src/screens/SessionDetailScreen.tsx` with:

```tsx
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { deleteSession, getSession, StudySession } from "../api/sessions";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { SubjectDot } from "../components/SubjectDot";
import { colors } from "../theme/colors";
import { fontSize, spacing } from "../theme/tokens";
import { formatDuration } from "../utils/time";

export function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [session, setSession] = useState<StudySession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    if (!token || !id) return;
    try {
      setSession(await getSession(token, Number(id)));
      setError(null);
    } catch {
      setError("Could not load session.");
    }
  }, [token, id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onDelete = async () => {
    if (!token || !session || deleting) return;
    setDeleting(true);
    try {
      await deleteSession(token, session.id);
      router.back();
    } catch {
      setError("Could not delete session.");
      setDeleting(false);
    }
  };

  if (!session) {
    return (
      <Screen>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Screen>
    );
  }

  return (
    <Screen>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.subjectRow}>
          <SubjectDot color={session.subject_color} size={14} />
          <Text style={styles.subjectName}>{session.subject_name}</Text>
        </View>
        <Text style={styles.duration}>{formatDuration(session.duration_minutes)}</Text>
        <Text style={styles.meta}>
          {session.started_at} → {session.ended_at}
        </Text>
        <Text style={styles.meta}>
          {session.source} · {session.duration_minutes} minutes
        </Text>
        {session.note ? <Text style={styles.note}>{session.note}</Text> : null}
        <View style={styles.actions}>
          <Button
            title="Edit"
            variant="outline"
            onPress={() => router.push(`/session/${session.id}/edit`)}
          />
          <Button title="Delete" variant="danger" onPress={onDelete} loading={deleting} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  subjectName: { fontSize: fontSize.title, fontWeight: "600", color: colors.text },
  duration: {
    fontSize: 40,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  meta: { fontSize: fontSize.caption, color: colors.textSecondary },
  note: { fontSize: fontSize.body, color: colors.text, marginTop: spacing.sm },
  actions: { gap: spacing.md, marginTop: spacing.xl },
  error: { color: colors.danger, fontSize: fontSize.body },
});
```

- [ ] **Step 2: Run detail tests**

Run: `pnpm test src/screens/SessionDetailScreen.test.tsx`
Expected: PASS — "History"/"revision"/"1h 0m" text, Edit/Delete presses (Button labels) and assertions unchanged.

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit && pnpm lint && pnpm test`
Expected: clean.

```bash
git add app/src/screens
git commit -m "feat(app): theme session detail screen"
```

---

### Task 12: New/Edit session screen

**Files:**
- Modify: `app/src/screens/NewSessionScreen.tsx`

- [ ] **Step 1: Restyle NewSessionScreen**

Replace `app/src/screens/NewSessionScreen.tsx` with:

```tsx
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSubjects, Subject } from "../api/subjects";
import { createSession, getSession, updateSession } from "../api/sessions";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
import { fontSize, radius, spacing } from "../theme/tokens";
import { localISO, todayDate } from "../utils/time";

export function NewSessionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [date, setDate] = useState(todayDate());
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    listSubjects(token)
      .then(setSubjects)
      .catch(() => setError("Could not load subjects."));

    if (isEdit && id) {
      getSession(token, Number(id))
        .then((s) => {
          setSubjectId(s.subject_id);
          setDate(s.started_at.slice(0, 10));
          setMinutes(String(s.duration_minutes));
          setNote(s.note ?? "");
        })
        .catch(() => setError("Could not load session."));
    }
  }, [token, id, isEdit]);

  const onSave = async () => {
    if (!token || subjectId === null) return;
    setError(null);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Enter a valid date like 2026-07-31.");
      return;
    }
    const [y, m, d] = date.split("-").map(Number);
    const started = new Date(y, m - 1, d, 0, 0, 0);
    if (
      started.getFullYear() !== y ||
      started.getMonth() !== m - 1 ||
      started.getDate() !== d
    ) {
      setError("Enter a valid date like 2026-07-31.");
      return;
    }
    const mins = Number(minutes);
    if (!Number.isInteger(mins) || mins <= 0) {
      setError("Minutes must be a positive whole number.");
      return;
    }

    setSaving(true);
    try {
      const ended = new Date(started.getTime() + mins * 60_000);
      const payload = {
        subject_id: subjectId,
        started_at: localISO(started),
        ended_at: localISO(ended),
        source: "manual" as const,
        note: note.trim() || null,
      };
      if (isEdit && id) {
        await updateSession(token, Number(id), payload);
      } else {
        await createSession(token, payload);
      }
      router.back();
    } catch {
      setError("Could not save session.");
      setSaving(false);
    }
  };

  return (
    <Screen title={isEdit ? "Edit session" : "Log a session"}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.subjectRow}>
          {subjects.map((s) => (
            <Chip
              key={s.id}
              label={s.name}
              selected={subjectId === s.id}
              onPress={() => setSubjectId(s.id)}
            />
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Date (YYYY-MM-DD)"
          placeholderTextColor={colors.textMuted}
          value={date}
          onChangeText={setDate}
        />
        <TextInput
          style={styles.input}
          placeholder="Minutes"
          placeholderTextColor={colors.textMuted}
          value={minutes}
          onChangeText={setMinutes}
          keyboardType="number-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Note (optional)"
          placeholderTextColor={colors.textMuted}
          value={note}
          onChangeText={setNote}
        />
        <Button
          title="Save session"
          onPress={onSave}
          disabled={subjectId === null}
          loading={saving}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  subjectRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: fontSize.body,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: fontSize.body },
});
```

- [ ] **Step 2: Run new-session tests**

Run: `pnpm test src/screens/NewSessionScreen.test.tsx`
Expected: PASS — placeholders, "Save session" label, chip text and payload assertions unchanged.

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit && pnpm lint && pnpm test`
Expected: clean.

```bash
git add app/src/screens
git commit -m "feat(app): theme session entry form"
```

---

### Task 13: Subjects screen

**Files:**
- Modify: `app/src/screens/SubjectsScreen.tsx`
- Modify: `app/src/screens/SubjectsScreen.test.tsx`

- [ ] **Step 1: Restyle SubjectsScreen**

Replace `app/src/screens/SubjectsScreen.tsx` with:

```tsx
import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { createSubject, deleteSubject, listSubjects, Subject } from "../api/subjects";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { SubjectDot } from "../components/SubjectDot";
import { colors } from "../theme/colors";
import { fontSize, radius, spacing } from "../theme/tokens";

export function SubjectsScreen() {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(colors.subjects[0]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setSubjects(await listSubjects(token));
      setError(null);
    } catch {
      setError("Could not load subjects.");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onAdd = async () => {
    if (!token || !name.trim()) return;
    setError(null);
    try {
      await createSubject(token, name.trim(), color);
      setName("");
      refresh();
    } catch {
      setError("Could not add subject.");
    }
  };

  const onDelete = async (id: number) => {
    if (!token) return;
    setError(null);
    try {
      await deleteSubject(token, id);
      refresh();
    } catch {
      setError("Could not delete subject (it may have sessions).");
    }
  };

  return (
    <Screen title="Subjects">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Card>
        <TextInput
          style={styles.input}
          placeholder="Subject name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />
        <View style={styles.palette}>
          {colors.subjects.map((c) => (
            <Pressable
              key={c}
              testID={`color-${c}`}
              onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
            />
          ))}
        </View>
        <Button title="Add" onPress={onAdd} disabled={!name.trim()} />
      </Card>
      <FlatList
        data={subjects}
        keyExtractor={(s) => String(s.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <SubjectDot color={item.color} />
            <Text style={styles.rowName}>{item.name}</Text>
            <Pressable
              testID={`delete-${item.id}`}
              accessibilityLabel={`Delete ${item.name}`}
              onPress={() => onDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: fontSize.body,
    color: colors.text,
  },
  palette: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  swatchActive: { borderWidth: 3, borderColor: colors.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowName: { flex: 1, fontSize: fontSize.body, color: colors.text },
  error: { color: colors.danger, fontSize: fontSize.body },
});
```

- [ ] **Step 2: Update the delete test**

In `app/src/screens/SubjectsScreen.test.tsx`, the delete test pressed `getByText("Delete")` — the delete control is now an icon-only Pressable. Replace that interaction:

```tsx
  it("deletes a subject", async () => {
    mockList.mockResolvedValue([
      { id: 1, user_id: 1, name: "Math", color: "#4F46E5", created_at: "" },
    ]);
    mockDelete.mockResolvedValue(undefined);

    const { getByTestId } = await render(<SubjectsScreen />);
    await waitFor(() => expect(getByTestId("delete-1")).toBeTruthy());
    await fireEvent.press(getByTestId("delete-1"));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("tok", 1));
  });
```

Also check the "creates a subject" test — it presses `getByText("Add")` which remains valid (Button label). The Add button is now `disabled={!name.trim()}` — the test types a name before pressing, so it's enabled. If the test presses without typing first, adjust the test to type first.

- [ ] **Step 3: Run subjects tests**

Run: `pnpm test src/screens/SubjectsScreen.test.tsx`
Expected: PASS.

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit && pnpm lint && pnpm test`
Expected: clean.

```bash
git add app/src/screens
git commit -m "feat(app): theme subjects screen"
```

---

### Task 14: Theme hygiene and final verification

**Files:**
- Create: `app/src/theme/hygiene.test.ts`

- [ ] **Step 1: Write the failing hygiene test**

Create `app/src/theme/hygiene.test.ts`:

```ts
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const dirs = ["src/screens", "src/components", "src/app"];

describe("theme hygiene", () => {
  it("has no raw hex colors outside the theme module", () => {
    const offenders: string[] = [];
    for (const dir of dirs) {
      const absolute = join(process.cwd(), dir);
      for (const file of readdirSync(absolute, { recursive: true }) as string[]) {
        if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
        const content = readFileSync(join(absolute, file), "utf8");
        const lines = content.split("\n");
        lines.forEach((line, i) => {
          if (/#[0-9A-Fa-f]{6}/.test(line)) {
            offenders.push(`${dir}/${file}:${i + 1}`);
          }
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});
```

Note: `readdirSync` with `{ recursive: true }` requires Node 20+ (available). This test FAILS today (screens still contain hardcoded hex) and must pass at the end of this task.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/theme/hygiene.test.ts`
Expected: FAIL — lists files with raw hex.

- [ ] **Step 3: Fix remaining offenders**

Search for any remaining hardcoded hex outside `src/theme/`:

Run: `rg -n "#[0-9A-Fa-f]{6}" app/src --glob '!theme/**'`
(Expected: only `theme/colors.ts` and test mocks — e.g. `SubjectsScreen.test.tsx` mock data uses `"#4F46E5"`/`"#10B981"` as server-provided subject colors, which is legitimate test data, not styling.)

If `hygiene.test.ts` flags test files with mock subject colors (e.g. `subject_color: "#10B981"` in HistoryScreen.test.tsx), update the test's `dirs` to scan only `src/screens/*.tsx` files that are NOT test files, or exclude `*.test.tsx`:

```ts
if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
if (file.endsWith(".test.tsx") || file.endsWith(".test.ts")) continue;
```

That keeps the gate on real source files while allowing mock data hex in tests.

- [ ] **Step 4: Run hygiene test**

Run: `pnpm test src/theme/hygiene.test.ts`
Expected: PASS.

- [ ] **Step 5: Full verification**

Run from `app/`:
- `npx tsc --noEmit` — clean
- `pnpm lint` — 0 errors (10 pre-existing warnings OK)
- `pnpm test` — all suites pass
- `pnpm test -- --coverage` — overall ≥ 80%; new/changed files (components, theme) ≥ 80%

- [ ] **Step 6: Commit**

```bash
git add app/src/theme
git commit -m "test(app): enforce theme hygiene"
```

---

## Self-review notes (author's checklist)

- Spec coverage: colors/tokens → Task 1; components (Button/Card/Chip/Screen/StatCard/SubjectDot) → Tasks 2-5; chrome (root layout bg + StatusBar light + dark tab bar with Ionicons) → Task 6; screens (Login/Register, Home, Timer, History, Session detail, New/Edit session, Subjects) → Tasks 7-13; theme smoke test (no raw hex in source) → Task 14. Spec's "Screen title headers" and "StatCard highlighted streak" are covered.
- Deviations from spec (noted): Button `loading` renders an ActivityIndicator instead of swapping the label text (screens pass static titles + `loading`); Button gains a `testID` prop to preserve existing screen-test IDs; Subjects delete is icon-only (trash-outline) so its test switches to `delete-<id>` testID; Home greeting keeps `sync-outline` as decorative icon.
- Type consistency: `colors.subjects[0]` is `"#FC4C02"` (the palette default) — SubjectsScreen uses it for the default swatch; `ButtonVariant` union shared between Button and screens; `StatCard.icon` typed via `keyof typeof Ionicons.glyphMap`.
- Existing screen tests were built against the old labels/IDs — each restyle task verifies its suite still passes and only adjusts where labels/controls changed (Task 13's delete test, Task 7's potential text-color assertions).
- The hygiene test excludes `*.test.*` files so mock server data (subject colors) can use hex without failing the gate.
