package api

import (
	"errors"
	"net/http"
	"strconv"

	"cogna/backend/internal/store"
)

type sessionHandlers struct {
	st *store.Store
}

type sessionPayload struct {
	SubjectID int64   `json:"subject_id"`
	StartedAt string  `json:"started_at"`
	EndedAt   string  `json:"ended_at"`
	Source    string  `json:"source"`
	Note      *string `json:"note"`
}

func (h *sessionHandlers) validate(w http.ResponseWriter, p *sessionPayload) bool {
	if p.SubjectID <= 0 {
		writeError(w, http.StatusBadRequest, "invalid_subject", "subject_id must be a positive integer")
		return false
	}
	start, err := parseTime(p.StartedAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_started_at", "started_at must be ISO 8601 like 2026-07-31T09:00:00")
		return false
	}
	end, err := parseTime(p.EndedAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_ended_at", "ended_at must be ISO 8601 like 2026-07-31T09:00:00")
		return false
	}
	if !end.After(start) {
		writeError(w, http.StatusBadRequest, "invalid_range", "started_at must be before ended_at")
		return false
	}
	if p.Source != "timer" && p.Source != "manual" {
		writeError(w, http.StatusBadRequest, "invalid_source", "source must be timer or manual")
		return false
	}
	if p.Note != nil && len(*p.Note) > 500 {
		writeError(w, http.StatusBadRequest, "invalid_note", "note must be at most 500 characters")
		return false
	}
	return true
}

func (h *sessionHandlers) list(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := store.SessionFilter{
		From: q.Get("from"),
		To:   q.Get("to"),
		Q:    q.Get("q"),
	}
	if v := q.Get("subject_id"); v != "" {
		parsed, err := parseInt64(v)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_subject_id", "subject_id must be a positive integer")
			return
		}
		f.SubjectID = parsed
	}
	if v := q.Get("limit"); v != "" {
		limit, err := strconv.Atoi(v)
		if err != nil || limit < 1 || limit > 200 {
			writeError(w, http.StatusBadRequest, "invalid_limit", "limit must be between 1 and 200")
			return
		}
		f.Limit = limit
	} else {
		f.Limit = 50
	}
	if v := q.Get("offset"); v != "" {
		offset, err := strconv.Atoi(v)
		if err != nil || offset < 0 {
			writeError(w, http.StatusBadRequest, "invalid_offset", "offset must be a non-negative integer")
			return
		}
		f.Offset = offset
	}
	sessions, total, err := h.st.ListSessions(userIDFrom(r), f)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not list sessions")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"sessions": sessions,
		"total":     total,
		"limit":     f.Limit,
		"offset":    f.Offset,
	})
}

func (h *sessionHandlers) get(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_id", "id must be a positive integer")
		return
	}
	sess, err := h.st.SessionByID(userIDFrom(r), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "session not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal", "could not get session")
		return
	}
	writeJSON(w, http.StatusOK, sess)
}

func (h *sessionHandlers) create(w http.ResponseWriter, r *http.Request) {
	var p sessionPayload
	if err := decodeJSON(w, r, &p); err != nil {
		return
	}
	if !h.validate(w, &p) {
		return
	}
	sess, err := h.st.CreateSession(userIDFrom(r), p.SubjectID, p.StartedAt, p.EndedAt, p.Source, p.Note)
	if err != nil {
		if errors.Is(err, store.ErrSubjectNotFound) {
			writeError(w, http.StatusBadRequest, "invalid_subject", "subject does not exist")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal", "could not create session")
		return
	}
	newly, err := h.st.EvaluateAchievements(userIDFrom(r))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not evaluate achievements")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"session":          sess,
		"new_achievements": newly,
	})
}

func (h *sessionHandlers) update(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_id", "id must be a positive integer")
		return
	}
	var p sessionPayload
	if err := decodeJSON(w, r, &p); err != nil {
		return
	}
	if !h.validate(w, &p) {
		return
	}
	sess, err := h.st.UpdateSession(userIDFrom(r), id, p.SubjectID, p.StartedAt, p.EndedAt, p.Note)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "not_found", "session not found")
		case errors.Is(err, store.ErrSubjectNotFound):
			writeError(w, http.StatusBadRequest, "invalid_subject", "subject does not exist")
		default:
			writeError(w, http.StatusInternalServerError, "internal", "could not update session")
		}
		return
	}
	newly, err := h.st.EvaluateAchievements(userIDFrom(r))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not evaluate achievements")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"session":          sess,
		"new_achievements": newly,
	})
}

func (h *sessionHandlers) delete(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_id", "id must be a positive integer")
		return
	}
	err := h.st.DeleteSession(userIDFrom(r), id)
	switch {
	case err == nil:
		w.WriteHeader(http.StatusNoContent)
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "session not found")
	default:
		writeError(w, http.StatusInternalServerError, "internal", "could not delete session")
	}
}
