package api

import "strings"

// trimLower trims surrounding whitespace and lowercases a string.
func trimLower(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}
