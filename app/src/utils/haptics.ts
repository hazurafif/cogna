import * as Haptics from "expo-haptics";

function settle(p: Promise<unknown> | undefined): void {
  if (p && typeof p.then === "function") {
    p.then(
      () => {},
      () => {},
    );
  }
}

export function hapticLight(): void {
  try {
    settle(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  } catch {
    // haptics are unavailable in tests
  }
}

export function hapticSuccess(): void {
  try {
    settle(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  } catch {
    // haptics are unavailable in tests
  }
}
