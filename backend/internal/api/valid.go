package api

import (
	"strconv"
	"strings"
)

// trimLower trims surrounding whitespace and lowercases a string.
func trimLower(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

// strconvFormatInt formats n as a decimal string.
func strconvFormatInt(n int64) string {
	return strconv.FormatInt(n, 10)
}
