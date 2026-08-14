package api

import (
	"net/http"
	"time"

	"cogna/backend/internal/store"
)

type achievementsHandlers struct {
	st *store.Store
}

func (h *achievementsHandlers) list(w http.ResponseWriter, r *http.Request) {
	achievements, err := h.st.ListAchievements(userIDFrom(r))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not list achievements")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"achievements": achievements})
}

func (h *achievementsHandlers) evaluate(w http.ResponseWriter, r *http.Request) {
	newly, err := h.st.EvaluateAchievements(userIDFrom(r))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not evaluate achievements")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"new_achievements": newly})
}

// parseReminderTime validates a "HH:MM" clock string.
func parseReminderTime(s string) bool {
	_, err := time.Parse("15:04", s)
	return err == nil
}
