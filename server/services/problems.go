package services

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
)

type ProblemDetails struct {
	Slug          string `json:"slug"`
	Title         string `json:"title"`
	HasStatement  bool   `json:"hasStatement"`
	StatementHTML string `json:"statementHtml"`
	Snippet       string `json:"snippet"`
	URL           string `json:"url"`
}

var (
	snippetCache   = make(map[string]string)
	statementCache = make(map[string]string)
	cacheMutex     sync.RWMutex

	tagRegex    = regexp.MustCompile(`<[^>]+>`)
	styleRegex  = regexp.MustCompile(`(?i)<style[^>]*>[\s\S]*?</style>`)
	svgRegex    = regexp.MustCompile(`(?i)<svg[^>]*>[\s\S]*?</svg>`)
	scriptRegex = regexp.MustCompile(`(?i)<script[^>]*>[\s\S]*?</script>`)
	spaceRegex  = regexp.MustCompile(`\s+`)
)

func resolveStatementPath(slug string) string {
	if slug == "" {
		return ""
	}
	candidates := []string{
		filepath.Join("..", "initFiles", slug, "problemStatement.html"),
		filepath.Join(".", "initFiles", slug, "problemStatement.html"),
		filepath.Join("..", "..", "initFiles", slug, "problemStatement.html"),
	}

	for _, c := range candidates {
		if info, err := os.Stat(c); err == nil && !info.IsDir() {
			return c
		}
	}
	return ""
}

func ExtractSnippetFromHTML(html string) string {
	if html == "" {
		return ""
	}
	cleaned := styleRegex.ReplaceAllString(html, "")
	cleaned = svgRegex.ReplaceAllString(cleaned, "")
	cleaned = scriptRegex.ReplaceAllString(cleaned, "")
	cleaned = tagRegex.ReplaceAllString(cleaned, " ")
	cleaned = spaceRegex.ReplaceAllString(cleaned, " ")
	cleaned = strings.TrimSpace(cleaned)

	if len(cleaned) <= 160 {
		return cleaned
	}
	return cleaned[:160] + "..."
}

func SlugToTitle(slug string) string {
	if slug == "" {
		return "Challenge"
	}
	parts := strings.Split(slug, "-")
	for i, p := range parts {
		low := strings.ToLower(p)
		if low == "ii" {
			parts[i] = "II"
		} else if low == "iii" {
			parts[i] = "III"
		} else if low == "iv" {
			parts[i] = "IV"
		} else if low == "1" || low == "2" {
			parts[i] = low
		} else if len(p) > 0 {
			parts[i] = strings.ToUpper(p[:1]) + p[1:]
		}
	}
	return strings.Join(parts, " ")
}

func GetProblemStatementHTML(slug string) string {
	if slug == "" {
		return ""
	}
	cacheMutex.RLock()
	val, ok := statementCache[slug]
	cacheMutex.RUnlock()
	if ok {
		return val
	}

	path := resolveStatementPath(slug)
	if path != "" {
		if content, err := os.ReadFile(path); err == nil {
			str := string(content)
			cacheMutex.Lock()
			statementCache[slug] = str
			cacheMutex.Unlock()
			return str
		}
	}
	return ""
}

func GetProblemSnippet(slug string) string {
	if slug == "" {
		return ""
	}
	cacheMutex.RLock()
	val, ok := snippetCache[slug]
	cacheMutex.RUnlock()
	if ok {
		return val
	}

	html := GetProblemStatementHTML(slug)
	if html != "" {
		snippet := ExtractSnippetFromHTML(html)
		cacheMutex.Lock()
		snippetCache[slug] = snippet
		cacheMutex.Unlock()
		return snippet
	}
	return ""
}

func GetProblemDetails(slug string) ProblemDetails {
	html := GetProblemStatementHTML(slug)
	snippet := GetProblemSnippet(slug)
	title := SlugToTitle(slug)

	return ProblemDetails{
		Slug:          slug,
		Title:         title,
		HasStatement:  html != "",
		StatementHTML: html,
		Snippet:       snippet,
		URL:           fmt.Sprintf("https://www.hackerrank.com/challenges/%s/problem", slug),
	}
}
