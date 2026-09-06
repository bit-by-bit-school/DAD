package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"hackerrank-server/db"
	"hackerrank-server/models"
	"hackerrank-server/services"
)

func RateSolutionHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	solutionID := chi.URLParam(r, "id")
	currentUser, _ := GetUserFromContext(r.Context())

	var payload struct {
		Cleverness  interface{} `json:"cleverness"`
		Readability interface{} `json:"readability"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Cleverness and Readability must be integers between 1 and 5."})
		return
	}

	parseScore := func(val interface{}) (int, bool) {
		switch v := val.(type) {
		case float64:
			return int(v), true
		case int:
			return v, true
		case string:
			if parsed, err := strconv.Atoi(v); err == nil {
				return parsed, true
			}
		}
		return 0, false
	}

	cScore, cOk := parseScore(payload.Cleverness)
	rScore, rOk := parseScore(payload.Readability)

	if !cOk || !rOk || cScore < 1 || cScore > 5 || rScore < 1 || rScore > 5 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Cleverness and Readability must be integers between 1 and 5."})
		return
	}

	var rating models.Rating
	err := db.DB.Where("solutionId = ? AND userId = ?", solutionID, currentUser.ID).First(&rating).Error
	if err != nil {
		rating = models.Rating{
			ID:          uuid.New().String(),
			SolutionID:  solutionID,
			UserID:      currentUser.ID,
			Cleverness:  cScore,
			Readability: rScore,
		}
		db.DB.Create(&rating)
	} else {
		db.DB.Model(&rating).Updates(map[string]interface{}{
			"cleverness":  cScore,
			"readability": rScore,
		})
		rating.Cleverness = cScore
		rating.Readability = rScore
	}

	// Create notification & Web Push if rater is not solution owner
	var sol models.Solution
	if err := db.DB.Where("id = ?", solutionID).First(&sol).Error; err == nil {
		if sol.UserID != currentUser.ID {
			notif := models.Notification{
				ID:         uuid.New().String(),
				UserID:     sol.UserID,
				ActorID:    &currentUser.ID,
				SolutionID: solutionID,
				Type:       "RATING",
				Message:    fmt.Sprintf("@%s rated your solution for \"%s\" (Cleverness: %d/5, Readability: %d/5)", currentUser.Username, sol.ChallengeTitle, cScore, rScore),
			}
			db.DB.Create(&notif)

			go services.SendPushToUser(sol.UserID, services.PushPayload{
				Title: "New Solution Rating",
				Body:  fmt.Sprintf("@%s rated your solution for \"%s\" (Clever: %d/5, Read: %d/5)", currentUser.Username, sol.ChallengeTitle, cScore, rScore),
				Icon:  "/assets/icon-192.png",
				Badge: "/assets/badge-72.png",
				Tag:   "rating-" + solutionID,
				Data: map[string]interface{}{
					"type":       "RATING",
					"solutionId": solutionID,
					"url":        fmt.Sprintf("/?solutionId=%s", solutionID),
				},
				Actions: services.DefaultPushActions(),
			})
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"rating":  rating,
	})
}


func CreateCommentHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	solutionID := chi.URLParam(r, "id")
	currentUser, _ := GetUserFromContext(r.Context())

	var payload struct {
		Content   string      `json:"content"`
		StartLine interface{} `json:"startLine"`
		EndLine   interface{} `json:"endLine"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || strings.TrimSpace(payload.Content) == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Comment content cannot be empty."})
		return
	}

	var sol models.Solution
	if err := db.DB.Where("id = ?", solutionID).First(&sol).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Solution not found."})
		return
	}

	var startLine, endLine *int
	commentType := "GENERAL"

	parseInt := func(val interface{}) (int, bool) {
		if val == nil {
			return 0, false
		}
		switch v := val.(type) {
		case float64:
			return int(v), true
		case int:
			return v, true
		case string:
			if v == "" {
				return 0, false
			}
			if parsed, err := strconv.Atoi(v); err == nil {
				return parsed, true
			}
		}
		return 0, false
	}

	if sVal, ok := parseInt(payload.StartLine); ok {
		if sVal < 1 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "startLine must be a positive integer >= 1."})
			return
		}
		startLine = &sVal
		commentType = "LINE_REVIEW"

		if eVal, ok := parseInt(payload.EndLine); ok {
			if eVal < sVal {
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(map[string]string{"error": "endLine must be an integer >= startLine."})
				return
			}
			endLine = &eVal
		} else {
			endLine = &sVal
		}
	}

	comment := models.Comment{
		ID:          uuid.New().String(),
		SolutionID:  solutionID,
		UserID:      currentUser.ID,
		Content:     strings.TrimSpace(payload.Content),
		StartLine:   startLine,
		EndLine:     endLine,
		CommentType: commentType,
	}

	if err := db.DB.Create(&comment).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	db.DB.Preload("User").Where("id = ?", comment.ID).First(&comment)

	// Create notification if commenter is not owner
	if sol.UserID != currentUser.ID {
		notif := models.Notification{
			ID:         uuid.New().String(),
			UserID:     sol.UserID,
			ActorID:    &currentUser.ID,
			SolutionID: solutionID,
			Type:       "COMMENT",
			Message:    fmt.Sprintf("@%s left a comment on \"%s\"", currentUser.Username, sol.ChallengeTitle),
		}
		db.DB.Create(&notif)

		go services.SendPushToUser(sol.UserID, services.PushPayload{
			Title: "New Comment on Your Solution",
			Body:  fmt.Sprintf("@%s: %s", currentUser.Username, payload.Content),
			Icon:  "/assets/icon-192.png",
			Badge: "/assets/badge-72.png",
			Tag:   "comment-" + solutionID,
			Data: map[string]interface{}{
				"type":       "COMMENT",
				"solutionId": solutionID,
				"url":        fmt.Sprintf("/?solutionId=%s", solutionID),
			},
			Actions: services.DefaultPushActions(),
		})
	}


	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"comment": comment,
	})
}

func DeleteCommentHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	commentID := chi.URLParam(r, "commentId")
	currentUser, _ := GetUserFromContext(r.Context())

	var comment models.Comment
	if err := db.DB.Where("id = ?", commentID).First(&comment).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Comment not found"})
		return
	}

	if comment.UserID != currentUser.ID && currentUser.Role != "ADMIN" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authorized to delete this comment."})
		return
	}

	db.DB.Where("id = ?", commentID).Delete(&models.Comment{})

	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
