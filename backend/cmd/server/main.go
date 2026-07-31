package main

import (
	"errors"
	"io/fs"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"

	"cogna/backend/internal/api"
	"cogna/backend/internal/store"
)

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// loadDotEnv loads a .env file. A missing file is fine (the env file is
// optional); other errors (e.g. parse failures) are returned.
func loadDotEnv(paths ...string) error {
	return godotenv.Load(paths...)
}

func newRouter(st *store.Store, secret string) http.Handler {
	r := chi.NewRouter()
	r.Mount("/", api.NewRouter(st, secret))
	return r
}

func main() {
	if err := loadDotEnv(); err != nil && !errors.Is(err, fs.ErrNotExist) {
		log.Printf("warning: could not load .env: %v", err)
	}

	addr := ":" + envOr("PORT", "8080")
	dbPath := envOr("DATABASE_PATH", "data/cogna.db")
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < 32 {
		log.Fatal("JWT_SECRET must be set to at least 32 characters")
	}

	st, err := store.Open(dbPath)
	if err != nil {
		log.Fatalf("open store: %v", err)
	}
	defer st.Close()

	server := &http.Server{Addr: addr, Handler: newRouter(st, secret)}
	log.Printf("cogna backend listening on %s", addr)
	log.Fatal(server.ListenAndServe())
}
