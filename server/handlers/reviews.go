package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"hackerrank-server/db"
	"hackerrank-server/models"
	"hackerrank-server/services"
)

func GetReviewsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	solutionID := chi.URLParam(r, "id")

	var rounds []models.ReviewRound
	db.DB.Order("roundNumber asc").Preload("Reviewer").Where("solutionId = ?", solutionID).Find(&rounds)

	json.NewEncoder(w).Encode(map[string]interface{}{"rounds": rounds})
}

func GenerateReviewDraftHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	solutionID := chi.URLParam(r, "id")
	currentUser, _ := GetUserFromContext(r.Context())

	if currentUser.Role != "ADMIN" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Only admins can generate code review drafts."})
		return
	}

	var sol models.Solution
	if err := db.DB.Preload("ReviewRounds", func(db *gorm.DB) *gorm.DB {
		return db.Order("roundNumber asc")
	}).Where("id = ?", solutionID).First(&sol).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Solution not found"})
		return
	}

	draftText := services.GenerateCodeReviewDraft(services.GeminiReviewInput{
		ChallengeTitle:  sol.ChallengeTitle,
		Language:        sol.Language,
		Code:            sol.Code,
		PreviousReviews: sol.ReviewRounds,
	})

	var parsedDraft interface{}
	if err := json.Unmarshal([]byte(draftText), &parsedDraft); err != nil {
		parsedDraft = map[string]interface{}{
			"summary":      draftText,
			"lineComments": []interface{}{},
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":         true,
		"nextRoundNumber": len(sol.ReviewRounds) + 1,
		"draft":           draftText,
		"parsedDraft":     parsedDraft,
	})
}

func PublishReviewHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	solutionID := chi.URLParam(r, "id")
	currentUser, _ := GetUserFromContext(r.Context())

	if currentUser.Role != "ADMIN" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Only admins can publish code review rounds."})
		return
	}

	var payload struct {
		RoundNumber interface{} `json:"roundNumber"`
		Status      string      `json:"status"`
		AdminNotes  string      `json:"adminNotes"`
		GeminiDraft interface{} `json:"geminiDraft"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || len(payload.AdminNotes) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Admin notes/feedback are required to publish a review round."})
		return
	}

	var sol models.Solution
	if err := db.DB.Where("id = ?", solutionID).First(&sol).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Solution not found."})
		return
	}

	roundNum := 1
	if payload.RoundNumber != nil {
		switch v := payload.RoundNumber.(type) {
		case float64:
			roundNum = int(v)
		case int:
			roundNum = v
		}
	}

	status := "APPROVED"
	if payload.Status != "" {
		status = payload.Status
	}

	var draftStr *string
	if payload.GeminiDraft != nil {
		switch v := payload.GeminiDraft.(type) {
		case string:
			draftStr = &v
		default:
			if b, err := json.Marshal(v); err == nil {
				s := string(b)
				draftStr = &s
			}
		}
	}

	var round models.ReviewRound
	err := db.DB.Where("solutionId = ? AND roundNumber = ?", solutionID, roundNum).First(&round).Error
	if err != nil {
		round = models.ReviewRound{
			ID:          uuid.New().String(),
			SolutionID:  solutionID,
			RoundNumber: roundNum,
			ReviewerID:  currentUser.ID,
			Status:      status,
			AdminNotes:  payload.AdminNotes,
			GeminiDraft: draftStr,
		}
		db.DB.Create(&round)
	} else {
		db.DB.Model(&round).Updates(map[string]interface{}{
			"status":      status,
			"adminNotes":  payload.AdminNotes,
			"geminiDraft": draftStr,
			"reviewerId":  currentUser.ID,
		})
		round.Status = status
		round.AdminNotes = payload.AdminNotes
		round.GeminiDraft = draftStr
		round.ReviewerID = currentUser.ID
	}

	db.DB.Preload("Reviewer").Where("id = ?", round.ID).First(&round)

	// Create notification if reviewer is not solution owner
	if sol.UserID != currentUser.ID {
		notif := models.Notification{
			ID:         uuid.New().String(),
			UserID:     sol.UserID,
			ActorID:    &currentUser.ID,
			SolutionID: solutionID,
			Type:       "REVIEW",
			Message:    fmt.Sprintf("@%s published Review Round #%d (%s) for \"%s\"", currentUser.Username, roundNum, status, sol.ChallengeTitle),
		}
		db.DB.Create(&notif)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"reviewRound": round,
	})
}
