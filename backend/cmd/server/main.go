package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
)

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func newRouter() http.Handler {
	r := chi.NewRouter()
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})
	return r
}

func main() {
	addr := ":" + envOr("PORT", "8080")
	server := &http.Server{Addr: addr, Handler: newRouter()}
	log.Printf("cogna backend listening on %s", addr)
	log.Fatal(server.ListenAndServe())
}
