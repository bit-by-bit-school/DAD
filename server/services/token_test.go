package services

import (
	"regexp"
	"strings"
	"testing"
)

func TestGenerateTechToken(t *testing.T) {
	// Build word lookup set
	vocab := make(map[string]bool)
	for _, w := range TechAdverbs {
		vocab[w] = true
	}
	for _, w := range TechVerbs {
		vocab[w] = true
	}
	for _, w := range TechAdjectives {
		vocab[w] = true
	}
	for _, w := range TechNouns {
		vocab[w] = true
	}

	validFormat := regexp.MustCompile(`^[a-z]+(-[a-z]+){2,3}$`)

	for i := 0; i < 1000; i++ {
		token := GenerateTechToken()

		if !validFormat.MatchString(token) {
			t.Fatalf("Token %q does not match expected 3-4 word pattern (lowercase letters and hyphens only)", token)
		}

		words := strings.Split(token, "-")
		if len(words) < 3 || len(words) > 4 {
			t.Fatalf("Token %q has %d words; expected 3 or 4", token, len(words))
		}

		for _, w := range words {
			if !vocab[w] {
				t.Fatalf("Word %q in token %q is not in the tech vocabulary dictionary", w, token)
			}
		}
	}
}
