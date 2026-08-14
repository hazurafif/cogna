package api

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	"cogna/backend/internal/store"
)

// NewRouter returns the HTTP handler for the cogna API.
func NewRouter(st *store.Store, secret string) http.Handler {
	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: false,
		MaxAge:           300,
	}))
	auth := &authHandlers{st: st, secret: secret}
	subjects := &subjectHandlers{st: st}
	sessions := &sessionHandlers{st: st}
	stats := &statsHandlers{st: st}
	settings := &settingsHandlers{st: st}
	achievements := &achievementsHandlers{st: st}
	challenges := &challengesHandlers{st: st}
	social := &socialHandlers{st: st}

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})
	r.Post("/api/v1/auth/register", auth.register)
	r.Post("/api/v1/auth/login", auth.login)

	r.Group(func(r chi.Router) {
		r.Use(func(next http.Handler) http.Handler { return requireAuth(secret, next) })
		r.Get("/api/v1/me", auth.me)
		r.Patch("/api/v1/me", auth.updateMe)
		r.Route("/api/v1/subjects", func(r chi.Router) {
			r.Get("/", subjects.list)
			r.Post("/", subjects.notFound)
			r.Put("/{id}", subjects.notFound)
			r.Delete("/{id}", subjects.notFound)
		})
		r.Route("/api/v1/sessions", func(r chi.Router) {
			r.Get("/", sessions.list)
			r.Get("/{id}", sessions.get)
			r.Post("/", sessions.create)
			r.Put("/{id}", sessions.update)
			r.Delete("/{id}", sessions.delete)
			r.Post("/{id}/kudos", social.addKudos)
			r.Delete("/{id}/kudos", social.removeKudos)
		})
		r.Get("/api/v1/stats/summary", stats.summary)
		r.Get("/api/v1/stats/trend", stats.trend)
		r.Get("/api/v1/challenges/current", challenges.current)
		r.Get("/api/v1/users/search", social.search)
		r.Post("/api/v1/users/{id}/follow", social.follow)
		r.Delete("/api/v1/users/{id}/follow", social.unfollow)
		r.Get("/api/v1/follows", social.following)
		r.Get("/api/v1/feed", social.feed)
		r.Get("/api/v1/leaderboard", social.leaderboard)
		r.Get("/api/v1/settings", settings.get)
		r.Put("/api/v1/settings", settings.update)
		r.Get("/api/v1/achievements", achievements.list)
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
