package api

import (
	"errors"
	"net/http"
	"net/mail"

	"cogna/backend/internal/auth"
	"cogna/backend/internal/store"
)

// dummyHash is a valid bcrypt hash of a throwaway string, verified against
// when the login email is unknown so that response timing does not reveal
// whether an account exists.
const dummyHash = "$2a$10$GvG6XC5sM79f3eQbYlYJhegW3l5NloCMmRmjQO13hqniPSqJYMYSK"

type authHandlers struct {
	st     *store.Store
	secret string
}

type credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	Token string      `json:"token"`
	User  *store.User `json:"user"`
}

func (h *authHandlers) register(w http.ResponseWriter, r *http.Request) {
	var creds credentials
	if err := decodeJSON(w, r, &creds); err != nil {
		return
	}
	creds.Email = trimLower(creds.Email)

	addr, err := mail.ParseAddress(creds.Email)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_email", "email must be a valid address")
		return
	}
	creds.Email = addr.Address
	if len(creds.Password) < 8 {
		writeError(w, http.StatusBadRequest, "invalid_password", "password must be at least 8 characters")
		return
	}
	if len(creds.Password) > 72 {
		writeError(w, http.StatusBadRequest, "invalid_password", "password must be at most 72 bytes")
		return
	}

	hash, err := auth.HashPassword(creds.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not hash password")
		return
	}
	user, err := h.st.CreateUser(creds.Email, hash)
	if err != nil {
		if errors.Is(err, store.ErrDuplicateEmail) {
			writeError(w, http.StatusConflict, "email_taken", "an account with this email already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal", "could not create user")
		return
	}

	token, err := auth.IssueToken(h.secret, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not issue token")
		return
	}
	writeJSON(w, http.StatusCreated, authResponse{Token: token, User: user})
}

func (h *authHandlers) login(w http.ResponseWriter, r *http.Request) {
	var creds credentials
	if err := decodeJSON(w, r, &creds); err != nil {
		return
	}
	creds.Email = trimLower(creds.Email)

	user, err := h.st.UserByEmail(creds.Email)
	if errors.Is(err, store.ErrNotFound) {
		// Burn bcrypt time against a dummy hash so that unknown emails
		// respond as slowly as known ones, hiding account existence.
		auth.VerifyPassword(dummyHash, creds.Password)
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "email or password is incorrect")
		return
	}
	if err != nil || user == nil || !auth.VerifyPassword(user.PasswordHash, creds.Password) {
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "email or password is incorrect")
		return
	}

	token, err := auth.IssueToken(h.secret, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not issue token")
		return
	}
	writeJSON(w, http.StatusOK, authResponse{Token: token, User: user})
}

func (h *authHandlers) me(w http.ResponseWriter, r *http.Request) {
	user, err := h.st.UserByID(userIDFrom(r))
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusUnauthorized, "unauthorized", "user no longer exists")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not load user")
		return
	}
	writeJSON(w, http.StatusOK, map[string]*store.User{"user": user})
}
