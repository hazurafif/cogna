import { StudySession } from "../api/sessions";
import {
  buildActivityWeek,
  DAILY_GOAL_MINUTES,
  dayKey,
  formatDayLabel,
  groupSessionsByDay,
  streakCopy,
  streakMilestone,
  todayMinutes,
} from "./daily";

const NOW = new Date(2026, 6, 31, 12, 0, 0);

function session(date: string, minutes: number): StudySession {
  return {
    id: 1,
    user_id: 1,
    subject_id: 1,
    subject_name: "Math",
    subject_icon: "book-open",
    started_at: date,
    ended_at: date,
    duration_minutes: minutes,
    source: "timer",
    note: null,
    created_at: "",
  };
}

describe("dayKey", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(dayKey(new Date(2026, 6, 3))).toBe("2026-07-03");
  });
});

describe("buildActivityWeek", () => {
  it("returns the last seven days ending today, oldest first", () => {
    const week = buildActivityWeek([], NOW);
    expect(week).toHaveLength(7);
    expect(week[0].date).toBe("2026-07-25");
    expect(week[6].date).toBe("2026-07-31");
    expect(week[6].isToday).toBe(true);
    expect(week.slice(0, 6).every((d) => !d.isToday)).toBe(true);
  });

  it("accumulates minutes per day and marks weekdays", () => {
    const week = buildActivityWeek(
      [
        session("2026-07-31T09:00:00", 60),
        session("2026-07-31T14:00:00", 30),
        session("2026-07-28T10:00:00", 45),
      ],
      NOW,
    );
    expect(week.find((d) => d.date === "2026-07-31")?.minutes).toBe(90);
    expect(week.find((d) => d.date === "2026-07-28")?.minutes).toBe(45);
    expect(week[0].weekday).toBe("Sat");
    expect(week[6].weekday).toBe("Fri");
  });

  it("ignores sessions outside the window", () => {
    const week = buildActivityWeek([session("2026-07-20T09:00:00", 600)], NOW);
    expect(week.every((d) => d.minutes === 0)).toBe(true);
  });
});

describe("todayMinutes", () => {
  it("sums only today's sessions", () => {
    const minutes = todayMinutes(
      [
        session("2026-07-31T09:00:00", 40),
        session("2026-07-30T09:00:00", 25),
      ],
      NOW,
    );
    expect(minutes).toBe(40);
  });

  it("is zero when there are no sessions today", () => {
    expect(todayMinutes([], NOW)).toBe(0);
  });
});

describe("formatDayLabel", () => {
  it("renders an English weekday and month", () => {
    expect(formatDayLabel("2026-07-27")).toBe("Mon, Jul 27");
  });
});

describe("groupSessionsByDay", () => {
  it("groups and sorts newest day first", () => {
    const groups = groupSessionsByDay(
      [
        session("2026-07-30T09:00:00", 30),
        session("2026-07-31T09:00:00", 60),
        session("2026-07-31T18:00:00", 15),
      ],
      NOW,
    );
    expect(groups.map((g) => g.key)).toEqual(["2026-07-31", "2026-07-30"]);
    expect(groups[0].data).toHaveLength(2);
  });

  it("labels today and yesterday", () => {
    const groups = groupSessionsByDay(
      [
        session("2026-07-31T09:00:00", 60),
        session("2026-07-30T09:00:00", 60),
        session("2026-07-29T09:00:00", 60),
      ],
      NOW,
    );
    expect(groups[0].label).toBe("Today");
    expect(groups[1].label).toBe("Yesterday");
    expect(groups[2].label).toBe("Wed, Jul 29");
  });
});

describe("streakMilestone", () => {
  it("returns milestones at 3, 7, 14 and 30 days", () => {
    expect(streakMilestone(0)).toBeNull();
    expect(streakMilestone(2)).toBeNull();
    expect(streakMilestone(3)).toBe("3-day streak");
    expect(streakMilestone(7)).toBe("7-day streak");
    expect(streakMilestone(14)).toBe("14-day streak");
    expect(streakMilestone(30)).toBe("30-day streak");
    expect(streakMilestone(45)).toBe("30-day streak");
  });
});

describe("streakCopy", () => {
  it("encourages protecting an active streak", () => {
    expect(streakCopy(5, true)).toBe("Keep it alive today");
  });

  it("is forgiving after a break", () => {
    expect(streakCopy(0, true)).toBe("Every streak starts with one session");
  });

  it("points new users at their first session", () => {
    expect(streakCopy(0, false)).toBe("Log your first session to start a streak");
  });
});

describe("DAILY_GOAL_MINUTES", () => {
  it("is a positive daily target", () => {
    expect(DAILY_GOAL_MINUTES).toBeGreaterThan(0);
  });
});
