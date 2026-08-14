package api

import (
	"net/http"
	"time"

	"cogna/backend/internal/store"
)

type challengesHandlers struct {
	st *store.Store
}

func (h *challengesHandlers) current(w http.ResponseWriter, r *http.Request) {
	progress, err := h.st.CurrentChallenge(userIDFrom(r), time.Now())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not load challenge")
		return
	}
	writeJSON(w, http.StatusOK, progress)
}
