package api

import (
	"net/http"
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
