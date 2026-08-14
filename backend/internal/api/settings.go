package api

import (
	"net/http"

	"cogna/backend/internal/store"
)

type settingsHandlers struct {
	st *store.Store
}

type settingsPayload struct {
	DailyGoalMinutes  int    `json:"daily_goal_minutes"`
	WeeklyGoalMinutes int    `json:"weekly_goal_minutes"`
	ReminderEnabled   bool   `json:"reminder_enabled"`
	ReminderTime      string `json:"reminder_time"`
}

// Ranges enforced for goal values (in minutes).
const (
	minDailyGoal  = 15
	maxDailyGoal  = 600
	minWeeklyGoal = 60
	maxWeeklyGoal = 4200
)

func (h *settingsHandlers) get(w http.ResponseWriter, r *http.Request) {
	settings, err := h.st.GetSettings(userIDFrom(r))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not load settings")
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

func (h *settingsHandlers) update(w http.ResponseWriter, r *http.Request) {
	var p settingsPayload
	if err := decodeJSON(w, r, &p); err != nil {
		return
	}
	if p.DailyGoalMinutes < minDailyGoal || p.DailyGoalMinutes > maxDailyGoal {
		writeError(w, http.StatusBadRequest, "invalid_daily_goal",
			"daily_goal_minutes must be between 15 and 600")
		return
	}
	if p.WeeklyGoalMinutes < minWeeklyGoal || p.WeeklyGoalMinutes > maxWeeklyGoal {
		writeError(w, http.StatusBadRequest, "invalid_weekly_goal",
			"weekly_goal_minutes must be between 60 and 4200")
		return
	}
	if !parseReminderTime(p.ReminderTime) {
		writeError(w, http.StatusBadRequest, "invalid_reminder_time",
			"reminder_time must be HH:MM")
		return
	}
	settings, err := h.st.UpdateSettings(userIDFrom(r), p.DailyGoalMinutes, p.WeeklyGoalMinutes, p.ReminderEnabled, p.ReminderTime)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not update settings")
		return
	}
	writeJSON(w, http.StatusOK, settings)
}
