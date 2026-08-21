package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"

	"hackerrank-server/models"
)

type GeminiReviewInput struct {
	ChallengeTitle  string
	Language        string
	Code            string
	PreviousReviews []models.ReviewRound
}

type GeminiRequestContent struct {
	Parts []GeminiPart `json:"parts"`
}

type GeminiPart struct {
	Text string `json:"text"`
}

type GeminiPayload struct {
	Contents []GeminiRequestContent `json:"contents"`
}

type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func GenerateCodeReviewDraft(input GeminiReviewInput) string {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		fallback := map[string]interface{}{
			"error":            "GEMINI_API_KEY is not configured in server environment.",
			"complexity":       "N/A - Configure GEMINI_API_KEY in server/.env",
			"readabilityScore": 0,
			"clevernessScore":  0,
			"summary":          "Gemini API key missing. Manual review mode active.",
			"strengths":        []string{"Clean submission synced successfully."},
			"edgeCases":        "Configure GEMINI_API_KEY in server/.env to enable automated AI edge case auditing.",
			"suggestions":      []string{"Add GEMINI_API_KEY to server/.env for automated AI code reviews."},
			"lineComments": []map[string]interface{}{
				{
					"startLine": 1,
					"endLine":   2,
					"type":      "SUGGESTION",
					"content":   "[Demo AI Draft] Ensure edge cases (empty inputs or nulls) are handled explicitly at function entry.",
				},
			},
		}
		data, _ := json.Marshal(fallback)
		return string(data)
	}

	historyContext := ""
	if len(input.PreviousReviews) > 0 {
		historyLines := []string{"\nPrevious Review Rounds:"}
		for _, r := range input.PreviousReviews {
			historyLines = append(historyLines, fmt.Sprintf("Round %d (%s): %s", r.RoundNumber, r.Status, r.AdminNotes))
		}
		historyContext = strings.Join(historyLines, "\n") + "\n"
	}

	lines := strings.Split(input.Code, "\n")
	numberedCode := make([]string, len(lines))
	for idx, line := range lines {
		numberedCode[idx] = fmt.Sprintf("%d: %s", idx+1, line)
	}

	prompt := fmt.Sprintf(`You are a senior algorithmic software engineer conducting a code review for a HackerRank solution.
Challenge: %s
Language: %s
%s
Code (with line numbers 1..N):
`+"```%s"+`
%s
`+"```"+`

Provide a comprehensive, structured code review.
Format your output strictly as a JSON object with the following fields:
{
  "complexity": "Time and Space complexity analysis (e.g., Time: O(N log N), Space: O(1))",
  "readabilityScore": 4,
  "clevernessScore": 4,
  "summary": "Brief overall summary of the solution logic",
  "strengths": ["List of key strengths"],
  "edgeCases": "Analysis of potential edge cases or bugs",
  "suggestions": ["Actionable improvement suggestions"],
  "lineComments": [
    {
      "startLine": 1,
      "endLine": 3,
      "type": "SUGGESTION",
      "content": "Specific line-by-line feedback or improvement advice attached to this line range"
    }
  ]
}`, input.ChallengeTitle, input.Language, historyContext, input.Language, strings.Join(numberedCode, "\n"))

	modelName := os.Getenv("GEMINI_MODEL")
	if modelName == "" {
		modelName = "gemini-3.6-flash"
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", modelName, apiKey)

	payload := GeminiPayload{
		Contents: []GeminiRequestContent{
			{
				Parts: []GeminiPart{
					{Text: prompt},
				},
			},
		},
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return errorJSON(err.Error())
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return errorJSON(err.Error())
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return errorJSON(err.Error())
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return errorJSON(err.Error())
	}

	var gResp GeminiResponse
	if err := json.Unmarshal(body, &gResp); err != nil {
		return errorJSON(err.Error())
	}

	if gResp.Error != nil {
		return errorJSON(gResp.Error.Message)
	}

	if len(gResp.Candidates) == 0 || len(gResp.Candidates[0].Content.Parts) == 0 {
		return errorJSON("Empty response candidate from Gemini API.")
	}

	text := gResp.Candidates[0].Content.Parts[0].Text
	re := regexp.MustCompile("(?s)^```(?:json)?\\s*(.*?)\\s*```$")
	matches := re.FindStringSubmatch(strings.TrimSpace(text))
	if len(matches) > 1 {
		text = matches[1]
	}

	return strings.TrimSpace(text)
}

func errorJSON(msg string) string {
	errMap := map[string]interface{}{
		"error":            msg,
		"summary":          "Failed to query Gemini API. Please check your API key.",
		"complexity":       "Unknown",
		"readabilityScore": 0,
		"clevernessScore":  0,
		"suggestions":      []string{"Check Gemini API Key and connectivity."},
	}
	data, _ := json.Marshal(errMap)
	return string(data)
}
