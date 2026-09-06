package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
)

func TestFeedbackHandlers(t *testing.T) {
	// Use temporary feedback file to isolate test
	tmpDir := t.TempDir()
	origFile := feedbackFile
	feedbackFile = filepath.Join(tmpDir, "test_feedback_log.json")
	t.Cleanup(func() {
		feedbackFile = origFile
	})

	// 1. Initial list should be empty
	reqList := httptest.NewRequest("GET", "/api/feedback", nil)
	rrList := httptest.NewRecorder()
	ListFeedbackHandler(rrList, reqList)

	if rrList.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rrList.Code)
	}

	var listRes struct {
		Success   bool            `json:"success"`
		Count     int             `json:"count"`
		Feedbacks []FeedbackEntry `json:"feedbacks"`
	}
	if err := json.NewDecoder(rrList.Body).Decode(&listRes); err != nil {
		t.Fatalf("failed to decode list response: %v", err)
	}
	if listRes.Count != 0 {
		t.Fatalf("expected 0 feedback items, got %d", listRes.Count)
	}

	// 2. Save a feedback item
	savePayload := map[string]interface{}{
		"comment":  "Test feedback comment",
		"category": "UI / Style",
		"path":     "/",
		"element": map[string]interface{}{
			"tagName": "BUTTON",
			"id":      "test-btn",
		},
	}
	body, _ := json.Marshal(savePayload)
	reqSave := httptest.NewRequest("POST", "/api/feedback", bytes.NewReader(body))
	rrSave := httptest.NewRecorder()
	SaveFeedbackHandler(rrSave, reqSave)

	if rrSave.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rrSave.Code)
	}

	var saveRes struct {
		Success  bool          `json:"success"`
		Feedback FeedbackEntry `json:"feedback"`
	}
	if err := json.NewDecoder(rrSave.Body).Decode(&saveRes); err != nil {
		t.Fatalf("failed to decode save response: %v", err)
	}
	if !saveRes.Success || saveRes.Feedback.Comment != "Test feedback comment" {
		t.Fatalf("unexpected save response: %+v", saveRes)
	}

	// 3. Verify item is listed
	rrList2 := httptest.NewRecorder()
	ListFeedbackHandler(rrList2, reqList)
	var listRes2 struct {
		Count     int             `json:"count"`
		Feedbacks []FeedbackEntry `json:"feedbacks"`
	}
	json.NewDecoder(rrList2.Body).Decode(&listRes2)
	if listRes2.Count != 1 {
		t.Fatalf("expected 1 feedback item, got %d", listRes2.Count)
	}

	// 4. Test ClearFeedbackHandler
	reqClear := httptest.NewRequest("DELETE", "/api/feedback", nil)
	rrClear := httptest.NewRecorder()
	ClearFeedbackHandler(rrClear, reqClear)

	if rrClear.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rrClear.Code)
	}

	var clearRes struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(rrClear.Body).Decode(&clearRes); err != nil {
		t.Fatalf("failed to decode clear response: %v", err)
	}
	if !clearRes.Success {
		t.Fatalf("expected clear success true, got false")
	}

	// 5. Verify list is now empty
	rrList3 := httptest.NewRecorder()
	ListFeedbackHandler(rrList3, reqList)
	var listRes3 struct {
		Count int `json:"count"`
	}
	json.NewDecoder(rrList3.Body).Decode(&listRes3)
	if listRes3.Count != 0 {
		t.Fatalf("expected 0 feedback items after clear, got %d", listRes3.Count)
	}
}
