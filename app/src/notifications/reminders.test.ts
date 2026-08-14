import * as Notifications from "expo-notifications";
import {
  STREAK_PROTECTION_THRESHOLD,
  syncReminders,
} from "./reminders";

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("id"),
  SchedulableTriggerInputTypes: { DAILY: "daily" },
}));

const mockCancelAll = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;
const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;

describe("syncReminders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestPermissions.mockResolvedValue({ granted: true });
  });

  it("cancels everything when reminders are disabled", async () => {
    await syncReminders({ enabled: false, time: "19:00" }, 0);

    expect(mockCancelAll).toHaveBeenCalledTimes(1);
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it("does not schedule without permission", async () => {
    mockRequestPermissions.mockResolvedValue({ granted: false });

    await syncReminders({ enabled: true, time: "19:00" }, 0);

    expect(mockCancelAll).toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("schedules one daily reminder at the chosen time", async () => {
    await syncReminders({ enabled: true, time: "19:30" }, 0);

    expect(mockCancelAll).toHaveBeenCalledTimes(1);
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: { type: "daily", hour: 19, minute: 30 },
      }),
    );
  });

  it("adds a streak protection nudge two hours later", async () => {
    await syncReminders({ enabled: true, time: "20:00" }, STREAK_PROTECTION_THRESHOLD);

    expect(mockSchedule).toHaveBeenCalledTimes(2);
    const triggers = mockSchedule.mock.calls.map(([arg]) => arg.trigger);
    expect(triggers).toContainEqual({ type: "daily", hour: 20, minute: 0 });
    expect(triggers).toContainEqual({ type: "daily", hour: 22, minute: 0 });
  });

  it("skips streak protection below the threshold", async () => {
    await syncReminders({ enabled: true, time: "20:00" }, STREAK_PROTECTION_THRESHOLD - 1);

    expect(mockSchedule).toHaveBeenCalledTimes(1);
  });

  it("wraps the protection hour past midnight", async () => {
    await syncReminders({ enabled: true, time: "23:00" }, STREAK_PROTECTION_THRESHOLD);

    const triggers = mockSchedule.mock.calls.map(([arg]) => arg.trigger);
    expect(triggers).toContainEqual({ type: "daily", hour: 1, minute: 0 });
  });
});
