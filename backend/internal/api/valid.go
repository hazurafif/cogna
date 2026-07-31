package api

import (
	"errors"
	"strconv"
	"strings"
	"time"
)

// trimLower trims surrounding whitespace and lowercases a string.
func trimLower(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

// strconvFormatInt formats n as a decimal string.
func strconvFormatInt(n int64) string {
	return strconv.FormatInt(n, 10)
}

// timeFormat is the canonical timestamp layout accepted by the API.
const timeFormat = "2006-01-02T15:04:05"

// parseTime parses s as timeFormat or RFC 3339.
func parseTime(s string) (time.Time, error) {
	for _, layout := range []string{timeFormat, time.RFC3339} {
		if t, err := time.Parse(layout, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, errors.New("invalid time format")
}

// parseInt64 parses s into a positive int64.
func parseInt64(s string) (int64, error) {
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil || n <= 0 {
		return 0, errors.New("invalid integer")
	}
	return n, nil
}
