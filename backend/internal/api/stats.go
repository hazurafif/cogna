package api

import (
	"net/http"
	"strconv"
	"time"

	"cogna/backend/internal/store"
)

type statsHandlers struct {
	st *store.Store
}

func (h *statsHandlers) summary(w http.ResponseWriter, r *http.Request) {
	sum, err := h.st.Summary(userIDFrom(r), time.Now())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not compute stats")
		return
	}
	writeJSON(w, http.StatusOK, sum)
}

func (h *statsHandlers) trend(w http.ResponseWriter, r *http.Request) {
	days := 30
	if v := r.URL.Query().Get("days"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 7 || parsed > 90 {
			writeError(w, http.StatusBadRequest, "invalid_days", "days must be between 7 and 90")
			return
		}
		days = parsed
	}
	trend, err := h.st.Trend(userIDFrom(r), days, time.Now())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not compute trend")
		return
	}
	writeJSON(w, http.StatusOK, trend)
}
