package api

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"cogna/backend/internal/store"
)

// trimLower trims surrounding whitespace and lowercases a string.
func trimLower(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

// strconvFormatInt formats n as a decimal string.
func strconvFormatInt(n int64) string {
	return strconv.FormatInt(n, 10)
}

// parseTime parses s as the canonical layout or RFC 3339.
func parseTime(s string) (time.Time, error) {
	return store.ParseTimestamp(s)
}

// parseInt64 parses s into a positive int64.
func parseInt64(s string) (int64, error) {
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil || n <= 0 {
		return 0, errors.New("invalid integer")
	}
	return n, nil
}
