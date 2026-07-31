package api

import (
	"context"
	"net/http"
	"strings"

	"cogna/backend/internal/auth"
)

type ctxKey int

const userIDKey ctxKey = 0

// requireAuth verifies the bearer token on the request and injects the
// authenticated user ID into the request context.
func requireAuth(secret string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenString, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok || tokenString == "" {
			writeError(w, http.StatusUnauthorized, "unauthorized", "missing bearer token")
			return
		}
		claims, err := auth.ParseToken(secret, tokenString)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "unauthorized", "invalid or expired token")
			return
		}
		ctx := context.WithValue(r.Context(), userIDKey, claims.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// userIDFrom returns the authenticated user ID stored by requireAuth.
func userIDFrom(r *http.Request) int64 {
	id, _ := r.Context().Value(userIDKey).(int64)
	return id
}
