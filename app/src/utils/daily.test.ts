import { StudySession } from "../api/sessions";
import {
  bestStreak,
  buildActivityWeek,
  DAILY_GOAL_MINUTES,
  dayKey,
  formatDayLabel,
  goalDaysThisWeek,
  groupSessionsByDay,
  heatIntensity,
  minutesPerDay,
  monthHeatmap,
  monthKey,
  startOfWeek,
  streakCopy,
  streakMilestone,
  todayMinutes,
  weekMinutes,
  weeklyTotals,
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

describe("startOfWeek", () => {
  it("returns the Monday of the current week", () => {
    expect(dayKey(startOfWeek(NOW))).toBe("2026-07-27");
  });
});

describe("weekMinutes", () => {
  it("sums only sessions in the current week", () => {
    const minutes = weekMinutes(
      [
        session("2026-07-27T09:00:00", 60), // Monday, in week
        session("2026-07-31T14:00:00", 30), // Friday, in week
        session("2026-07-26T09:00:00", 90), // Sunday, previous week
        session("2026-08-03T09:00:00", 45), // next week (Monday)
      ],
      NOW,
    );
    expect(minutes).toBe(90);
  });
});

describe("goalDaysThisWeek", () => {
  it("counts days in the week that hit the daily goal", () => {
    const days = goalDaysThisWeek(
      [
        session("2026-07-27T09:00:00", 120),
        session("2026-07-28T09:00:00", 60),
        session("2026-07-28T14:00:00", 61),
        session("2026-07-29T09:00:00", 30),
      ],
      DAILY_GOAL_MINUTES,
      NOW,
    );
    expect(days).toBe(2);
  });

  it("honors a custom goal", () => {
    const days = goalDaysThisWeek(
      [
        session("2026-07-27T09:00:00", 100),
        session("2026-07-28T09:00:00", 59),
        session("2026-07-28T14:00:00", 1),
      ],
      60,
      NOW,
    );
    expect(days).toBe(2);
  });
});

describe("minutesPerDay", () => {
  it("aggregates minutes by day", () => {
    const totals = minutesPerDay([
      session("2026-07-31T09:00:00", 60),
      session("2026-07-31T14:00:00", 30),
      session("2026-07-30T09:00:00", 45),
    ]);
    expect(totals.get("2026-07-31")).toBe(90);
    expect(totals.get("2026-07-30")).toBe(45);
    expect(totals.get("2026-07-29")).toBeUndefined();
  });
});

describe("bestStreak", () => {
  it("returns the longest run of consecutive study days", () => {
    const streak = bestStreak([
      session("2026-07-27T09:00:00", 30),
      session("2026-07-28T09:00:00", 30),
      session("2026-07-29T09:00:00", 30),
      session("2026-07-31T09:00:00", 30),
      session("2026-08-01T09:00:00", 30),
    ]);
    expect(streak).toBe(3);
  });

  it("is zero without sessions", () => {
    expect(bestStreak([])).toBe(0);
  });

  it("counts a single day as one", () => {
    expect(bestStreak([session("2026-07-31T09:00:00", 30)])).toBe(1);
  });
});

describe("weeklyTotals", () => {
  it("returns the last n weeks oldest first", () => {
    const weeks = weeklyTotals(
      [
        session("2026-07-31T09:00:00", 60), // current week
        session("2026-07-20T09:00:00", 45), // week of Jul 20
      ],
      4,
      NOW,
    );
    expect(weeks).toHaveLength(4);
    expect(weeks[0].weekStart).toBe("2026-07-06");
    expect(weeks[0].minutes).toBe(0);
    expect(weeks[1].weekStart).toBe("2026-07-13");
    expect(weeks[1].minutes).toBe(0);
    expect(weeks[2].weekStart).toBe("2026-07-20");
    expect(weeks[2].minutes).toBe(45);
    expect(weeks[3].weekStart).toBe("2026-07-27");
    expect(weeks[3].minutes).toBe(60);
  });
});

describe("monthKey", () => {
  it("formats a month as YYYY-MM", () => {
    expect(monthKey(new Date(2026, 6, 15))).toBe("2026-07");
  });
});

describe("monthHeatmap", () => {
  it("builds weeks aligned to Monday with minutes per day", () => {
    const totals = new Map([["2026-07-01", 45]]);
    const weeks = monthHeatmap(2026, 6, totals);
    // July 2026 starts on a Wednesday, so the first row has two leading blanks.
    expect(weeks[0][0]).toBeNull();
    expect(weeks[0][1]).toBeNull();
    expect(weeks[0][2]?.key).toBe("2026-07-01");
    expect(weeks[0][2]?.minutes).toBe(45);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("handles an empty month without errors", () => {
    const weeks = monthHeatmap(2026, 1, new Map());
    expect(weeks.length).toBeGreaterThan(0);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });
});

describe("heatIntensity", () => {
  it("maps minutes to five intensity levels", () => {
    expect(heatIntensity(0)).toBe(0);
    expect(heatIntensity(29)).toBe(1);
    expect(heatIntensity(30)).toBe(2);
    expect(heatIntensity(59)).toBe(2);
    expect(heatIntensity(60)).toBe(3);
    expect(heatIntensity(119)).toBe(3);
    expect(heatIntensity(120)).toBe(4);
  });
});
