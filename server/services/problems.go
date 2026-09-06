package services

import (
	"encoding/json"
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
	Platform      string `json:"platform"`
}

var (
	snippetCache   = make(map[string]string)
	statementCache = make(map[string]string)
	hrSlugSet      = make(map[string]bool)
	loadSlugsOnce  sync.Once
	cacheMutex     sync.RWMutex

	tagRegex    = regexp.MustCompile(`<[^>]+>`)
	styleRegex  = regexp.MustCompile(`(?i)<style[^>]*>[\s\S]*?</style>`)
	svgRegex    = regexp.MustCompile(`(?i)<svg[^>]*>[\s\S]*?</svg>`)
	scriptRegex = regexp.MustCompile(`(?i)<script[^>]*>[\s\S]*?</script>`)
	spaceRegex  = regexp.MustCompile(`\s+`)
	hrChallengeImgRegex = regexp.MustCompile(`https?://(?:s3\.amazonaws\.com/hr-challenge-images|hr-challenge-images\.s3\.amazonaws\.com)/([^"'\s>]+)`)
)

func loadHackerRankSlugs() {
	candidates := []string{
		filepath.Join("..", "initFiles", "all.json"),
		filepath.Join(".", "initFiles", "all.json"),
		filepath.Join("..", "..", "initFiles", "all.json"),
	}
	for _, c := range candidates {
		if content, err := os.ReadFile(c); err == nil {
			var slugs []string
			if err := json.Unmarshal(content, &slugs); err == nil {
				for _, s := range slugs {
					hrSlugSet[s] = true
				}
				return
			}
		}
	}
}

func IsLeetCodeSlug(slug string) bool {
	if slug == "" {
		return false
	}
	loadSlugsOnce.Do(loadHackerRankSlugs)
	if len(hrSlugSet) > 0 && hrSlugSet[slug] {
		return false
	}

	// Check curated LeetCode slugs
	curated := map[string]bool{
		"two-sum": true, "palindrome-number": true, "add-two-numbers": true,
		"longest-substring-without-repeating-characters": true, "median-of-two-sorted-arrays": true,
		"valid-parentheses": true, "merge-two-sorted-lists": true, "reverse-linked-list": true,
		"3sum": true, "container-with-most-water": true, "trapping-rain-water": true,
	}
	if curated[slug] {
		return true
	}

	// Check if statement HTML contains LeetCode indicators
	html := GetProblemStatementHTML(slug)
	if strings.Contains(html, "leetcode") || strings.Contains(html, "elfjS") || strings.Contains(html, "example-") || strings.Contains(html, "strong class=\"example\"") || strings.Contains(html, "Constraints:") {
		return true
	}

	// If it has a local statement but is not in HackerRank's all.json
	if len(hrSlugSet) > 0 && !hrSlugSet[slug] && resolveStatementPath(slug) != "" {
		return true
	}

	return false
}

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

func RewriteProblemImages(html string) string {
	if html == "" {
		return ""
	}
	return hrChallengeImgRegex.ReplaceAllStringFunc(html, func(match string) string {
		parts := strings.Split(match, "/")
		if len(parts) >= 2 {
			safeName := parts[len(parts)-2] + "-" + parts[len(parts)-1]
			return "/assets/challenge-images/" + safeName
		}
		if len(parts) > 0 {
			return "/assets/challenge-images/" + parts[len(parts)-1]
		}
		return match
	})
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
			str := RewriteProblemImages(string(content))
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
	isLC := IsLeetCodeSlug(slug)

	platform := "hackerrank"
	url := fmt.Sprintf("https://www.hackerrank.com/challenges/%s/problem", slug)

	if isLC {
		platform = "leetcode"
		url = fmt.Sprintf("https://leetcode.com/problems/%s/", slug)
	}

	return ProblemDetails{
		Slug:          slug,
		Title:         title,
		HasStatement:  html != "",
		StatementHTML: html,
		Snippet:       snippet,
		URL:           url,
		Platform:      platform,
	}
}
