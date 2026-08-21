package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"
)

var (
	feedbackMutex sync.Mutex
	feedbackFile  = "feedback_log.json"
)

type FeedbackEntry struct {
	ID          string      `json:"id"`
	Timestamp   string      `json:"timestamp"`
	Comment     string      `json:"comment"`
	Category    string      `json:"category"`
	Element     interface{} `json:"element"`
	CurrentPath string      `json:"currentPath"`
	Viewport    interface{} `json:"viewport"`
}

func getFeedbackList() []FeedbackEntry {
	feedbackMutex.Lock()
	defer feedbackMutex.Unlock()

	if _, err := os.Stat(feedbackFile); os.IsNotExist(err) {
		return []FeedbackEntry{}
	}

	data, err := os.ReadFile(feedbackFile)
	if err != nil {
		return []FeedbackEntry{}
	}

	var list []FeedbackEntry
	if err := json.Unmarshal(data, &list); err != nil {
		return []FeedbackEntry{}
	}

	return list
}

func saveFeedbackList(list []FeedbackEntry) error {
	feedbackMutex.Lock()
	defer feedbackMutex.Unlock()

	data, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return err
	}

	dir := filepath.Dir(feedbackFile)
	if dir != "" && dir != "." {
		os.MkdirAll(dir, 0755)
	}

	return os.WriteFile(feedbackFile, data, 0644)
}

func SaveFeedbackHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var payload struct {
		Comment     string      `json:"comment"`
		Category    string      `json:"category"`
		Element     interface{} `json:"element"`
		CurrentPath string      `json:"path"`
		Viewport    interface{} `json:"viewport"`
	}

	json.NewDecoder(r.Body).Decode(&payload)

	comment := payload.Comment
	if comment == "" {
		comment = "(No comment provided)"
	}

	category := payload.Category
	if category == "" {
		category = "General"
	}

	currPath := payload.CurrentPath
	if currPath == "" {
		currPath = "/"
	}

	randBytes := make([]byte, 3)
	rand.Read(randBytes)
	id := fmt.Sprintf("fb_%d_%s", time.Now().UnixMilli(), hex.EncodeToString(randBytes))

	entry := FeedbackEntry{
		ID:          id,
		Timestamp:   time.Now().UTC().Format(time.RFC3339),
		Comment:     comment,
		Category:    category,
		Element:     payload.Element,
		CurrentPath: currPath,
		Viewport:    payload.Viewport,
	}

	list := getFeedbackList()
	newList := append([]FeedbackEntry{entry}, list...)
	saveFeedbackList(newList)

	fmt.Printf("\n📢 [DIRECT BROWSER FEEDBACK RECEIVED]\n")
	fmt.Printf("💬 Comment: \"%s\" [%s]\n", entry.Comment, entry.Category)
	fmt.Printf("---------------------------------------------------\n\n")

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"feedback": entry,
	})
}

func ListFeedbackHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	list := getFeedbackList()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"count":     len(list),
		"feedbacks": list,
	})
}

func ClearFeedbackHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	saveFeedbackList([]FeedbackEntry{})

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "All feedback cleared",
	})
}
