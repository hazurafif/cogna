package api

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"cogna/backend/internal/store"
)

type socialHandlers struct {
	st *store.Store
}

func (h *socialHandlers) search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		writeError(w, http.StatusBadRequest, "invalid_q", "q is required")
		return
	}
	users, err := h.st.SearchUsers(userIDFrom(r), q)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not search users")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": users})
}

func (h *socialHandlers) follow(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_id", "id must be a positive integer")
		return
	}
	if err := h.st.Follow(userIDFrom(r), id); err != nil {
		if errors.Is(err, store.ErrUserNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "user not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal", "could not follow user")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"following": true})
}

func (h *socialHandlers) unfollow(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_id", "id must be a positive integer")
		return
	}
	if err := h.st.Unfollow(userIDFrom(r), id); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not unfollow user")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"following": false})
}

func (h *socialHandlers) following(w http.ResponseWriter, r *http.Request) {
	users, err := h.st.Following(userIDFrom(r), time.Now())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not list following")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"following": users})
}

func (h *socialHandlers) feed(w http.ResponseWriter, r *http.Request) {
	limit := 50
	offset := 0
	if v := r.URL.Query().Get("limit"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 1 || parsed > 100 {
			writeError(w, http.StatusBadRequest, "invalid_limit", "limit must be between 1 and 100")
			return
		}
		limit = parsed
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 0 {
			writeError(w, http.StatusBadRequest, "invalid_offset", "offset must be a non-negative integer")
			return
		}
		offset = parsed
	}
	items, err := h.st.Feed(userIDFrom(r), limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not load feed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *socialHandlers) addKudos(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_id", "id must be a positive integer")
		return
	}
	if err := h.st.AddKudos(userIDFrom(r), id); err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "not_found", "session not found")
		case errors.Is(err, store.ErrSelfKudos):
			writeError(w, http.StatusBadRequest, "self_kudos", "you cannot kudos your own session")
		default:
			writeError(w, http.StatusInternalServerError, "internal", "could not add kudos")
		}
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"kudos": true})
}

func (h *socialHandlers) removeKudos(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_id", "id must be a positive integer")
		return
	}
	if err := h.st.RemoveKudos(userIDFrom(r), id); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not remove kudos")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"kudos": false})
}

func (h *socialHandlers) leaderboard(w http.ResponseWriter, r *http.Request) {
	entries, err := h.st.FriendLeaderboard(userIDFrom(r), time.Now())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not load leaderboard")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"entries": entries})
}
