package api

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"cogna/backend/internal/store"
)

// NewRouter returns the HTTP handler for the cogna API.
func NewRouter(st *store.Store, secret string) http.Handler {
	r := chi.NewRouter()
	auth := &authHandlers{st: st, secret: secret}
	subjects := &subjectHandlers{st: st}
	sessions := &sessionHandlers{st: st}
	stats := &statsHandlers{st: st}

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})
	r.Post("/api/v1/auth/register", auth.register)
	r.Post("/api/v1/auth/login", auth.login)

	r.Group(func(r chi.Router) {
		r.Use(func(next http.Handler) http.Handler { return requireAuth(secret, next) })
		r.Get("/api/v1/me", auth.me)
		r.Route("/api/v1/subjects", func(r chi.Router) {
			r.Get("/", subjects.list)
			r.Post("/", subjects.create)
			r.Put("/{id}", subjects.update)
			r.Delete("/{id}", subjects.delete)
		})
		r.Route("/api/v1/sessions", func(r chi.Router) {
			r.Get("/", sessions.list)
			r.Get("/{id}", sessions.get)
			r.Post("/", sessions.create)
			r.Put("/{id}", sessions.update)
			r.Delete("/{id}", sessions.delete)
		})
		r.Get("/api/v1/stats/summary", stats.summary)
	})

	return r
}

// pathID parses the {id} route parameter into a positive int64.
func pathID(r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		return 0, false
	}
	return id, true
}

// Temporary stubs until Task 8 implements the real handlers.
type statsHandlers struct{ st *store.Store }

func (h *statsHandlers) summary(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not_implemented", "")
}
