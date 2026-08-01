package api

import (
	"net/http"

	"cogna/backend/internal/store"
)

type subjectHandlers struct {
	st *store.Store
}

func (h *subjectHandlers) list(w http.ResponseWriter, r *http.Request) {
	subs, err := h.st.ListSubjects()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not list subjects")
		return
	}
	writeJSON(w, http.StatusOK, subs)
}

// notFound reports that the subject catalog is read-only.
func (h *subjectHandlers) notFound(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotFound, "not_found", "subject catalog is read-only")
}
