package services

import (
	"encoding/json"
	"fmt"
	"html"
	"regexp"
	"strings"

	"hackerrank-server/models"
)

// StripInputPlumbing removes standard HackerRank I/O boilerplate (stdin reading,
// buffer allocators, scanner loops, main drivers, OutputPath file writers)
// while preserving the core algorithm functions, helper classes, and logic.
// It also returns the 1-based starting line offset of the extracted code relative to the original code.
func StripInputPlumbing(code string, language string) (string, int) {
	raw := strings.ReplaceAll(code, "\r\n", "\n")
	rawLines := strings.Split(raw, "\n")
	lang := strings.ToLower(strings.TrimSpace(language))

	switch {
	case strings.Contains(lang, "python") || strings.Contains(lang, "py"):
		return stripPythonPlumbing(rawLines)
	case strings.Contains(lang, "javascript") || strings.Contains(lang, "js") || strings.Contains(lang, "typescript") || strings.Contains(lang, "ts") || strings.Contains(lang, "node"):
		return stripJavaScriptPlumbing(rawLines)
	case strings.Contains(lang, "cpp") || strings.Contains(lang, "c++") || strings.Contains(lang, "c"):
		return stripCppPlumbing(rawLines)
	case strings.Contains(lang, "java"):
		return stripJavaPlumbing(rawLines)
	case strings.Contains(lang, "go") || strings.Contains(lang, "golang"):
		return stripGoPlumbing(rawLines)
	default:
		return stripGenericPlumbing(rawLines)
	}
}

func stripPythonPlumbing(lines []string) (string, int) {
	var keptLines []string
	startOffset := 1
	foundStart := false

	inMainBlock := false
	mainIndent := -1

	for idx, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Detect if __name__ == '__main__': entry
		if strings.HasPrefix(trimmed, "if __name__ ==") || strings.HasPrefix(trimmed, "if __name__==") {
			inMainBlock = true
			mainIndent = len(line) - len(strings.TrimLeft(line, " \t"))
			continue
		}

		if inMainBlock {
			currentIndent := len(line) - len(strings.TrimLeft(line, " \t"))
			if trimmed == "" {
				continue
			}
			if currentIndent > mainIndent {
				// Inside the main block, skip plumbing
				continue
			} else {
				inMainBlock = false
			}
		}

		// Skip shebang and standard sys/os imports if before any functions
		if !foundStart {
			if strings.HasPrefix(trimmed, "#!") ||
				trimmed == "import math" ||
				trimmed == "import os" ||
				trimmed == "import random" ||
				trimmed == "import re" ||
				trimmed == "import sys" ||
				strings.HasPrefix(trimmed, "# Complete the '") ||
				strings.HasPrefix(trimmed, "# The function is expected") ||
				strings.HasPrefix(trimmed, "# The function accepts") ||
				strings.HasPrefix(trimmed, "#") && len(trimmed) <= 2 {
				continue
			}
			if trimmed != "" {
				foundStart = true
				startOffset = idx + 1
			}
		}

		if foundStart {
			keptLines = append(keptLines, line)
		}
	}

	result := strings.TrimSpace(strings.Join(keptLines, "\n"))
	if result == "" {
		return strings.Join(lines, "\n"), 1
	}
	return result, startOffset
}

func stripJavaScriptPlumbing(lines []string) (string, int) {
	var keptLines []string
	startOffset := 1
	foundStart := false

	inMainFunc := false
	mainBraceDepth := 0

	inReadLineFunc := false
	readLineBraceDepth := 0

	for idx, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Check for readline or main function declaration
		if strings.HasPrefix(trimmed, "function main(") || strings.HasPrefix(trimmed, "function main (") {
			inMainFunc = true
			mainBraceDepth = strings.Count(line, "{") - strings.Count(line, "}")
			if mainBraceDepth <= 0 && strings.Contains(line, "{") && strings.Contains(line, "}") {
				inMainFunc = false
			}
			continue
		}
		if inMainFunc {
			mainBraceDepth += strings.Count(line, "{") - strings.Count(line, "}")
			if mainBraceDepth <= 0 {
				inMainFunc = false
			}
			continue
		}

		if strings.HasPrefix(trimmed, "function readLine(") {
			inReadLineFunc = true
			readLineBraceDepth = strings.Count(line, "{") - strings.Count(line, "}")
			if readLineBraceDepth <= 0 && strings.Contains(line, "{") && strings.Contains(line, "}") {
				inReadLineFunc = false
			}
			continue
		}
		if inReadLineFunc {
			readLineBraceDepth += strings.Count(line, "{") - strings.Count(line, "}")
			if readLineBraceDepth <= 0 {
				inReadLineFunc = false
			}
			continue
		}

		// Skip standard stdin setup lines before the function
		if !foundStart {
			if trimmed == "'use strict';" ||
				trimmed == `"use strict";` ||
				strings.HasPrefix(trimmed, "const fs = require") ||
				strings.HasPrefix(trimmed, "process.stdin.") ||
				strings.HasPrefix(trimmed, "let inputString") ||
				strings.HasPrefix(trimmed, "let currentLine") ||
				strings.HasPrefix(trimmed, "/*") ||
				strings.HasPrefix(trimmed, "*") ||
				strings.HasPrefix(trimmed, "*/") ||
				trimmed == "" {
				continue
			}
			foundStart = true
			startOffset = idx + 1
		}

		if foundStart {
			keptLines = append(keptLines, line)
		}
	}

	result := strings.TrimSpace(strings.Join(keptLines, "\n"))
	if result == "" {
		return strings.Join(lines, "\n"), 1
	}
	return result, startOffset
}

func stripCppPlumbing(lines []string) (string, int) {
	var keptLines []string
	startOffset := 1
	foundStart := false

	inMain := false
	mainDepth := 0
	inHelper := false
	helperDepth := 0

	for idx, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Check for main
		if strings.HasPrefix(trimmed, "int main(") || strings.HasPrefix(trimmed, "int main (") {
			inMain = true
			mainDepth = strings.Count(line, "{") - strings.Count(line, "}")
			continue
		}
		if inMain {
			mainDepth += strings.Count(line, "{") - strings.Count(line, "}")
			if mainDepth <= 0 {
				inMain = false
			}
			continue
		}

		// Check for string trim/split boilerplate helpers
		if strings.HasPrefix(trimmed, "string ltrim(") || strings.HasPrefix(trimmed, "string rtrim(") || strings.HasPrefix(trimmed, "vector<string> split(") {
			if strings.HasSuffix(trimmed, ";") {
				// Forward declaration, skip
				continue
			}
			inHelper = true
			helperDepth = strings.Count(line, "{") - strings.Count(line, "}")
			continue
		}
		if inHelper {
			helperDepth += strings.Count(line, "{") - strings.Count(line, "}")
			if helperDepth <= 0 {
				inHelper = false
			}
			continue
		}

		if !foundStart {
			if strings.HasPrefix(trimmed, "#include") ||
				trimmed == "using namespace std;" ||
				strings.HasPrefix(trimmed, "string ltrim(") ||
				strings.HasPrefix(trimmed, "string rtrim(") ||
				strings.HasPrefix(trimmed, "vector<string> split(") ||
				trimmed == "" {
				continue
			}
			foundStart = true
			startOffset = idx + 1
		}

		if foundStart {
			keptLines = append(keptLines, line)
		}
	}

	result := strings.TrimSpace(strings.Join(keptLines, "\n"))
	if result == "" {
		return strings.Join(lines, "\n"), 1
	}
	return result, startOffset
}

func stripJavaPlumbing(lines []string) (string, int) {
	var keptLines []string
	startOffset := 1
	foundStart := false

	inSolutionClass := false
	solutionClassDepth := 0
	inMain := false
	mainDepth := 0

	for idx, line := range lines {
		trimmed := strings.TrimSpace(line)

		if strings.HasPrefix(trimmed, "public class Solution") || strings.HasPrefix(trimmed, "class Solution") {
			inSolutionClass = true
			solutionClassDepth = strings.Count(line, "{") - strings.Count(line, "}")
			continue
		}

		if inSolutionClass {
			if strings.HasPrefix(trimmed, "public static void main(") || strings.HasPrefix(trimmed, "public static void main (") {
				inMain = true
				mainDepth = strings.Count(line, "{") - strings.Count(line, "}")
				continue
			}
			if inMain {
				mainDepth += strings.Count(line, "{") - strings.Count(line, "}")
				if mainDepth <= 0 {
					inMain = false
				}
				continue
			}
			solutionClassDepth += strings.Count(line, "{") - strings.Count(line, "}")
			if solutionClassDepth <= 0 {
				inSolutionClass = false
			}
		}

		if !foundStart {
			if strings.HasPrefix(trimmed, "import ") ||
				strings.HasPrefix(trimmed, "/*") ||
				strings.HasPrefix(trimmed, "*") ||
				strings.HasPrefix(trimmed, "*/") ||
				trimmed == "" {
				continue
			}
			foundStart = true
			startOffset = idx + 1
		}

		if foundStart && !inMain {
			keptLines = append(keptLines, line)
		}
	}

	result := strings.TrimSpace(strings.Join(keptLines, "\n"))
	if result == "" {
		return strings.Join(lines, "\n"), 1
	}
	return result, startOffset
}

func stripGoPlumbing(lines []string) (string, int) {
	var keptLines []string
	startOffset := 1
	foundStart := false

	inMain := false
	mainDepth := 0
	inHelper := false
	helperDepth := 0

	for idx, line := range lines {
		trimmed := strings.TrimSpace(line)

		if strings.HasPrefix(trimmed, "func main(") {
			inMain = true
			mainDepth = strings.Count(line, "{") - strings.Count(line, "}")
			continue
		}
		if inMain {
			mainDepth += strings.Count(line, "{") - strings.Count(line, "}")
			if mainDepth <= 0 {
				inMain = false
			}
			continue
		}

		if strings.HasPrefix(trimmed, "func readLine(") || strings.HasPrefix(trimmed, "func checkError(") {
			inHelper = true
			helperDepth = strings.Count(line, "{") - strings.Count(line, "}")
			continue
		}
		if inHelper {
			helperDepth += strings.Count(line, "{") - strings.Count(line, "}")
			if helperDepth <= 0 {
				inHelper = false
			}
			continue
		}

		if !foundStart {
			if strings.HasPrefix(trimmed, "package ") ||
				strings.HasPrefix(trimmed, "import ") ||
				strings.HasPrefix(trimmed, "(") ||
				strings.HasPrefix(trimmed, ")") ||
				strings.HasPrefix(trimmed, `"`) ||
				trimmed == "" {
				continue
			}
			foundStart = true
			startOffset = idx + 1
		}

		if foundStart {
			keptLines = append(keptLines, line)
		}
	}

	result := strings.TrimSpace(strings.Join(keptLines, "\n"))
	if result == "" {
		return strings.Join(lines, "\n"), 1
	}
	return result, startOffset
}

func stripGenericPlumbing(lines []string) (string, int) {
	// General fallback: return all lines
	return strings.Join(lines, "\n"), 1
}

var (
	tagRe    = regexp.MustCompile(`<[^>]+>`)
	hTagRe   = regexp.MustCompile(`(?i)<h([1-6])[^>]*>([\s\S]*?)</h[1-6]>`)
	pTagRe   = regexp.MustCompile(`(?i)<p[^>]*>([\s\S]*?)</p>`)
	liTagRe  = regexp.MustCompile(`(?i)<li[^>]*>([\s\S]*?)</li>`)
	brTagRe  = regexp.MustCompile(`(?i)<br\s*/?>`)
	preTagRe = regexp.MustCompile(`(?i)<pre[^>]*>([\s\S]*?)</pre>`)
	codeTagRe= regexp.MustCompile(`(?i)<code[^>]*>([\s\S]*?)</code>`)
	multiSpaceRe = regexp.MustCompile(`[ \t]+`)
	multiNewlineRe = regexp.MustCompile(`\n{3,}`)
)

// HTMLToPlainText converts problem statement HTML into clean, well-formatted markdown/plain text.
func HTMLToPlainText(rawHTML string) string {
	if rawHTML == "" {
		return ""
	}

	t := styleRegex.ReplaceAllString(rawHTML, "")
	t = svgRegex.ReplaceAllString(t, "")
	t = scriptRegex.ReplaceAllString(t, "")

	// Preserve code blocks
	t = preTagRe.ReplaceAllStringFunc(t, func(m string) string {
		match := preTagRe.FindStringSubmatch(m)
		if len(match) > 1 {
			inner := tagRe.ReplaceAllString(match[1], "")
			return fmt.Sprintf("\n```\n%s\n```\n", strings.TrimSpace(html.UnescapeString(inner)))
		}
		return m
	})

	// Inline code
	t = codeTagRe.ReplaceAllStringFunc(t, func(m string) string {
		match := codeTagRe.FindStringSubmatch(m)
		if len(match) > 1 {
			inner := tagRe.ReplaceAllString(match[1], "")
			return fmt.Sprintf(" `%s` ", strings.TrimSpace(html.UnescapeString(inner)))
		}
		return m
	})

	// Headings
	t = hTagRe.ReplaceAllStringFunc(t, func(m string) string {
		match := hTagRe.FindStringSubmatch(m)
		if len(match) > 2 {
			level := match[1]
			inner := tagRe.ReplaceAllString(match[2], "")
			prefix := strings.Repeat("#", len(level)+2)
			return fmt.Sprintf("\n\n%s %s\n\n", prefix, strings.TrimSpace(html.UnescapeString(inner)))
		}
		return m
	})

	// Paragraphs
	t = pTagRe.ReplaceAllStringFunc(t, func(m string) string {
		match := pTagRe.FindStringSubmatch(m)
		if len(match) > 1 {
			inner := tagRe.ReplaceAllString(match[1], " ")
			return fmt.Sprintf("\n\n%s\n\n", strings.TrimSpace(html.UnescapeString(inner)))
		}
		return m
	})

	// List items
	t = liTagRe.ReplaceAllStringFunc(t, func(m string) string {
		match := liTagRe.FindStringSubmatch(m)
		if len(match) > 1 {
			inner := tagRe.ReplaceAllString(match[1], " ")
			return fmt.Sprintf("\n- %s", strings.TrimSpace(html.UnescapeString(inner)))
		}
		return m
	})

	// Line breaks
	t = brTagRe.ReplaceAllString(t, "\n")

	// Strip remaining HTML tags
	t = tagRe.ReplaceAllString(t, " ")

	// Decode HTML entities
	t = html.UnescapeString(t)

	// Clean whitespace
	lines := strings.Split(t, "\n")
	for i, line := range lines {
		lines[i] = multiSpaceRe.ReplaceAllString(line, " ")
	}
	t = strings.Join(lines, "\n")
	t = multiNewlineRe.ReplaceAllString(t, "\n\n")

	return strings.TrimSpace(t)
}

// ReviewPromptPayload encapsulates the response for GET /api/solutions/{id}/review/prompt
type ReviewPromptPayload struct {
	Success          bool     `json:"success"`
	Prompt           string   `json:"prompt"`
	ChallengeTitle   string   `json:"challengeTitle"`
	ChallengeSlug    string   `json:"challengeSlug"`
	Language         string   `json:"language"`
	CleanedCode      string   `json:"cleanedCode"`
	StartLineOffset  int      `json:"startLineOffset"`
	TotalLines       int      `json:"totalLines"`
	NextRoundNumber  int      `json:"nextRoundNumber"`
	ProblemStatement string   `json:"problemStatement"`
	OutputSchema     string   `json:"outputSchema"`
}

// BuildReviewPrompt creates a comprehensive, structured prompt suitable for any LLM chat
// containing problem statement, stripped solution code, historical review context, and strict JSON output instructions.
func BuildReviewPrompt(sol models.Solution, problem ProblemDetails) string {
	cleanedCode, startLineOffset := StripInputPlumbing(sol.Code, sol.Language)

	// Build numbered code matching actual editor line numbers
	origLines := strings.Split(strings.ReplaceAll(sol.Code, "\r\n", "\n"), "\n")
	cleanedLines := strings.Split(cleanedCode, "\n")

	var numberedCodeLines []string
	for idx, cl := range cleanedLines {
		actualLineNum := startLineOffset + idx
		if actualLineNum > len(origLines) {
			actualLineNum = idx + 1
		}
		numberedCodeLines = append(numberedCodeLines, fmt.Sprintf("%d: %s", actualLineNum, cl))
	}
	numberedCode := strings.Join(numberedCodeLines, "\n")

	// Problem statement text
	statementText := HTMLToPlainText(problem.StatementHTML)
	if statementText == "" {
		statementText = problem.Snippet
	}
	if statementText == "" {
		statementText = fmt.Sprintf("Challenge URL: %s", problem.URL)
	}

	// Previous review rounds history
	nextRoundNum := len(sol.ReviewRounds) + 1
	var historySection string
	if len(sol.ReviewRounds) > 0 {
		var roundItems []string
		for _, r := range sol.ReviewRounds {
			reviewer := "Admin"
			if r.Reviewer.Username != "" {
				reviewer = r.Reviewer.Username
			}
			roundItems = append(roundItems, fmt.Sprintf("- **Round %d** (Status: `%s`, Reviewer: @%s):\n  %s", r.RoundNumber, r.Status, reviewer, strings.TrimSpace(r.AdminNotes)))
		}
		historySection = fmt.Sprintf("### Previous Code Review Rounds:\n%s\n", strings.Join(roundItems, "\n\n"))
	} else {
		historySection = "### Previous Code Review Rounds:\n*This is Round 1 (no previous official review rounds recorded).*\n"
	}

	// Previous comments / line reviews
	var commentsSection string
	if len(sol.Comments) > 0 {
		var commentItems []string
		for _, c := range sol.Comments {
			author := "User"
			if c.User.Username != "" {
				author = c.User.Username
			}
			lineInfo := "General Comment"
			if c.StartLine != nil {
				if c.EndLine != nil && *c.EndLine > *c.StartLine {
					lineInfo = fmt.Sprintf("Lines %d-%d", *c.StartLine, *c.EndLine)
				} else {
					lineInfo = fmt.Sprintf("Line %d", *c.StartLine)
				}
			}
			commentItems = append(commentItems, fmt.Sprintf("- [%s] @%s: %s", lineInfo, author, strings.TrimSpace(c.Content)))
		}
		commentsSection = fmt.Sprintf("### Existing Community Comments & Line Reviews:\n%s\n", strings.Join(commentItems, "\n"))
	}

	prompt := fmt.Sprintf(`You are a senior algorithmic software engineer and competitive programming code reviewer conducting Review Round #%d for a HackerRank submission.

# 1. Challenge Information
- **Title**: %s
- **Slug**: %s
- **Language**: %s
- **Submission Author**: @%s
- **Challenge URL**: https://www.hackerrank.com/challenges/%s/problem

# 2. Problem Statement
%s

# 3. Candidate Solution Code (Core Algorithm, excluding I/O plumbing)
The code below has line numbers prefixing each line (corresponding directly to the submitted source file):
`+"```%s"+`
%s
`+"```"+`

# 4. Review Context & Previous History
%s
%s
# 5. Evaluation Instructions & Criteria
Be very concise, sacrifice grammar for brevity.
1. **Algorithmic Correctness & Logic**: Verify the mathematical / algorithmic correctness against the problem specifications and constraints.
2. **Time & Space Complexity**: Determine exact Big-O Time and Space complexities (e.g. Time: O(N log N), Space: O(1)) and assess if optimal.
3. **Edge Cases & Boundary Analysis**: Scrutinize zero, negative, maximum constraint limits, empty arrays, odd/even parity, and overflow conditions.
4. **Follow-up on Previous Feedback**: If previous review rounds requested changes or raised issues, explicitly evaluate if they are resolved.
5. **Code Style, Cleanliness & Idioms**: Assess variable naming, modularity, readability, and idiomatic practices for %s.
6. **Decision & Line Comments**: Recommend whether the submission should be APPROVED or CHANGES_REQUESTED. Provide specific, actionable line-by-line review comments with exact line numbers where improvements or corrections are needed.

# 6. Response Format Requirement
You MUST respond ONLY with a valid, parseable JSON object enclosed in a `+"```json"+` markdown code fence. Do not include introductory or concluding conversational text outside the JSON.

Required JSON Schema:
`+"```json"+`
{
  "status": "APPROVED",
  "complexity": "Time: O(...), Space: O(...)",
  "clevernessScore": 4,
  "readabilityScore": 5,
  "summary": "Concise summary of the solution's logic, correctness, and evaluation.",
  "strengths": [
    "Key strength 1",
    "Key strength 2"
  ],
  "edgeCases": "Analysis of boundary conditions, edge cases, or potential failure points.",
  "suggestions": [
    "Actionable improvement suggestion 1",
    "Actionable improvement suggestion 2"
  ],
  "adminNotes": "Official review round notes and decision justification for Round #%d.",
  "lineComments": [
    {
      "startLine": %d,
      "endLine": %d,
      "type": "SUGGESTION",
      "content": "Specific actionable inline feedback for these line numbers."
    }
  ]
}
`+"```"+`
`,
		nextRoundNum,
		sol.ChallengeTitle,
		sol.ChallengeSlug,
		sol.Language,
		sol.User.Username,
		sol.ChallengeSlug,
		statementText,
		sol.Language,
		numberedCode,
		historySection,
		commentsSection,
		sol.Language,
		nextRoundNum,
		startLineOffset,
		startLineOffset,
	)

	return strings.TrimSpace(prompt)
}

// ParseReviewResponse handles extracting structured JSON from raw LLM output
func ParseReviewResponse(rawResponse string) (map[string]interface{}, error) {
	trimmed := strings.TrimSpace(rawResponse)

	// Extract ```json ... ``` or ``` ... ```
	re := regexp.MustCompile("(?s)```(?:json)?\\s*([\\{\\[][\\s\\S]*?[\\}\\]])\\s*```")
	matches := re.FindStringSubmatch(trimmed)
	if len(matches) > 1 {
		trimmed = strings.TrimSpace(matches[1])
	} else {
		// Try to find first { to last }
		firstBrace := strings.Index(trimmed, "{")
		lastBrace := strings.LastIndex(trimmed, "}")
		if firstBrace != -1 && lastBrace > firstBrace {
			trimmed = trimmed[firstBrace : lastBrace+1]
		}
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(trimmed), &parsed); err != nil {
		return nil, err
	}
	return parsed, nil
}
