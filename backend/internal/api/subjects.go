package api

import (
	"errors"
	"net/http"
	"regexp"
	"strings"

	"cogna/backend/internal/store"
)

type subjectHandlers struct {
	st *store.Store
}

type subjectPayload struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

var colorPattern = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

func (h *subjectHandlers) validate(w http.ResponseWriter, p *subjectPayload) bool {
	p.Name = strings.TrimSpace(p.Name)
	if p.Name == "" || len(p.Name) > 60 {
		writeError(w, http.StatusBadRequest, "invalid_name", "name must be 1-60 characters")
		return false
	}
	if !colorPattern.MatchString(p.Color) {
		writeError(w, http.StatusBadRequest, "invalid_color", "color must be a hex value like #4F46E5")
		return false
	}
	return true
}

func (h *subjectHandlers) list(w http.ResponseWriter, r *http.Request) {
	subs, err := h.st.ListSubjects(userIDFrom(r))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not list subjects")
		return
	}
	writeJSON(w, http.StatusOK, subs)
}

func (h *subjectHandlers) create(w http.ResponseWriter, r *http.Request) {
	var p subjectPayload
	if err := decodeJSON(w, r, &p); err != nil {
		return
	}
	if !h.validate(w, &p) {
		return
	}
	sub, err := h.st.CreateSubject(userIDFrom(r), p.Name, p.Color)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not create subject")
		return
	}
	writeJSON(w, http.StatusCreated, sub)
}

func (h *subjectHandlers) update(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_id", "id must be a positive integer")
		return
	}
	var p subjectPayload
	if err := decodeJSON(w, r, &p); err != nil {
		return
	}
	if !h.validate(w, &p) {
		return
	}
	sub, err := h.st.UpdateSubject(userIDFrom(r), id, p.Name, p.Color)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "subject not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal", "could not update subject")
		return
	}
	writeJSON(w, http.StatusOK, sub)
}

func (h *subjectHandlers) delete(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_id", "id must be a positive integer")
		return
	}
	err := h.st.DeleteSubject(userIDFrom(r), id)
	switch {
	case err == nil:
		w.WriteHeader(http.StatusNoContent)
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "subject not found")
	case errors.Is(err, store.ErrSubjectInUse):
		writeError(w, http.StatusConflict, "subject_in_use", "subject has sessions; delete or reassign them first")
	default:
		writeError(w, http.StatusInternalServerError, "internal", "could not delete subject")
	}
}
