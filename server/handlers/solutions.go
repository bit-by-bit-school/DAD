package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"hackerrank-server/db"
	"hackerrank-server/models"
)

type SyncSolutionItem struct {
	ID             string      `json:"id"`
	SubmissionID   string      `json:"submissionId"`
	ChallengeSlug  string      `json:"challengeSlug"`
	ChallengeTitle string      `json:"challengeTitle"`
	Slug           string      `json:"slug"`
	Name           string      `json:"name"`
	ContestSlug    string      `json:"contestSlug"`
	Language       string      `json:"language"`
	Code           string      `json:"code"`
	Score          interface{} `json:"score"`
	Status         string      `json:"status"`
	SubmittedAt    interface{} `json:"submittedAt"`
	Username       string      `json:"username"`
}

func SolutionsSyncHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	currentUser, _ := GetUserFromContext(r.Context())

	var payload struct {
		Solutions []SyncSolutionItem `json:"solutions"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.Solutions == nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Payload must contain a \"solutions\" array."})
		return
	}

	syncedIDs := make([]string, 0)

	for _, sol := range payload.Solutions {
		code := strings.TrimSpace(sol.Code)
		if code == "" {
			continue
		}

		challengeSlug := sol.ChallengeSlug
		if challengeSlug == "" {
			challengeSlug = sol.Slug
		}
		if challengeSlug == "" {
			challengeSlug = "unknown"
		}

		challengeTitle := sol.ChallengeTitle
		if challengeTitle == "" {
			challengeTitle = sol.Name
		}
		if challengeTitle == "" {
			challengeTitle = challengeSlug
		}

		submissionID := sol.SubmissionID
		if submissionID == "" {
			submissionID = sol.ID
		}
		if submissionID == "" {
			submissionID = fmt.Sprintf("%s_%s_%d", challengeSlug, sol.Language, time.Now().UnixNano())
		}

		contestSlug := sol.ContestSlug
		if contestSlug == "" {
			contestSlug = "master"
		}

		language := sol.Language
		if language == "" {
			language = "javascript"
		}

		status := sol.Status
		if status == "" {
			status = "Accepted"
		}

		var scoreVal float64 = 1.0
		if sol.Score != nil {
			switch v := sol.Score.(type) {
			case float64:
				scoreVal = v
			case string:
				if parsed, err := strconv.ParseFloat(v, 64); err == nil {
					scoreVal = parsed
				}
			}
		}

		submittedAt := time.Now()
		if sol.SubmittedAt != nil {
			if str, ok := sol.SubmittedAt.(string); ok && str != "" {
				if parsedTime, err := time.Parse(time.RFC3339, str); err == nil {
					submittedAt = parsedTime
				}
			}
		}

		targetUserID := currentUser.ID
		if strings.TrimSpace(sol.Username) != "" {
			cleanUsername := strings.TrimSpace(sol.Username)
			var targetUser models.User
			if err := db.DB.Where("username = ?", cleanUsername).First(&targetUser).Error; err != nil {
				randBytes := make([]byte, 4)
				rand.Read(randBytes)
				newToken := fmt.Sprintf("hr_%s_%s", cleanUsername, hex.EncodeToString(randBytes))
				targetUser = models.User{
					ID:       uuid.New().String(),
					Username: cleanUsername,
					Token:    newToken,
					Role:     "USER",
				}
				db.DB.Create(&targetUser)
			}
			targetUserID = targetUser.ID
		}

		// Clean up old admin duplicate if target user is different
		var existingAdminSol models.Solution
		if err := db.DB.Joins("User").Where("Solution.submissionId = ? AND User.role = 'ADMIN'", submissionID).First(&existingAdminSol).Error; err == nil {
			if existingAdminSol.UserID != targetUserID {
				db.DB.Where("id = ?", existingAdminSol.ID).Delete(&models.Solution{})
			}
		}

		var record models.Solution
		err := db.DB.Where("submissionId = ? AND userId = ?", submissionID, targetUserID).First(&record).Error
		if err != nil {
			// Create new solution
			record = models.Solution{
				ID:             uuid.New().String(),
				SubmissionID:   submissionID,
				ChallengeSlug:  challengeSlug,
				ChallengeTitle: challengeTitle,
				ContestSlug:    &contestSlug,
				Language:       language,
				Code:           code,
				Score:          &scoreVal,
				Status:         &status,
				SubmittedAt:    &submittedAt,
				UserID:         targetUserID,
			}
			db.DB.Create(&record)
		} else {
			// Update existing solution
			db.DB.Model(&record).Updates(map[string]interface{}{
				"challengeTitle": challengeTitle,
				"contestSlug":    contestSlug,
				"language":       language,
				"code":           code,
				"score":          scoreVal,
				"status":         status,
				"submittedAt":    submittedAt,
			})
		}

		syncedIDs = append(syncedIDs, record.ID)
	}

	// Auto-remap legacy admin-owned solutions where submissionId encodes username
	var adminUser models.User
	if err := db.DB.Where("token = ?", "hr_admin_master_token_2026").First(&adminUser).Error; err == nil {
		var adminSols []models.Solution
		db.DB.Where("userId = ?", adminUser.ID).Find(&adminSols)
		for _, sol := range adminSols {
			idx := strings.LastIndex(sol.SubmissionID, "_")
			if idx > 0 {
				possibleUsername := sol.SubmissionID[idx+1:]
				if possibleUsername != "" && possibleUsername != "admin" {
					var userMatch models.User
					if err := db.DB.Where("username = ?", possibleUsername).First(&userMatch).Error; err != nil {
						randBytes := make([]byte, 4)
						rand.Read(randBytes)
						newToken := fmt.Sprintf("hr_%s_%s", possibleUsername, hex.EncodeToString(randBytes))
						userMatch = models.User{
							ID:       uuid.New().String(),
							Username: possibleUsername,
							Token:    newToken,
							Role:     "USER",
						}
						db.DB.Create(&userMatch)
					}
					db.DB.Model(&sol).Update("userId", userMatch.ID)
				}
			}
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"syncedCount": len(syncedIDs),
		"syncedUser":  currentUser.Username,
	})
}

func SolutionsGetUsersHandler(w http.ResponseWriter, r *http.Request) {
	GetUsersListPublicHandler(w, r)
}

func SolutionsListHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	q := r.URL.Query()

	challengeSlug := q.Get("challengeSlug")
	language := q.Get("language")
	search := q.Get("search")

	rawUsernames := q.Get("usernames")
	if rawUsernames == "" {
		rawUsernames = q.Get("username")
	}

	rawUserIDs := q.Get("userIds")
	if rawUserIDs == "" {
		rawUserIDs = q.Get("userId")
	}

	limitStr := q.Get("limit")
	limit := 50
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	pageStr := q.Get("page")
	page := 1
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	offsetStr := q.Get("offset")
	skip := (page - 1) * limit
	if offsetStr != "" {
		if off, err := strconv.Atoi(offsetStr); err == nil && off >= 0 {
			skip = off
		}
	}

	query := db.DB.Model(&models.Solution{}).Joins("User")

	if challengeSlug != "" {
		query = query.Where("Solution.challengeSlug = ?", challengeSlug)
	}
	if language != "" {
		query = query.Where("Solution.language = ?", language)
	}

	if rawUsernames != "" {
		parts := strings.Split(rawUsernames, ",")
		names := make([]string, 0, len(parts))
		for _, p := range parts {
			if trimmed := strings.TrimSpace(p); trimmed != "" {
				names = append(names, trimmed)
			}
		}
		if len(names) == 1 {
			query = query.Where("User.username = ?", names[0])
		} else if len(names) > 1 {
			query = query.Where("User.username IN ?", names)
		}
	} else if rawUserIDs != "" {
		parts := strings.Split(rawUserIDs, ",")
		ids := make([]string, 0, len(parts))
		for _, p := range parts {
			if trimmed := strings.TrimSpace(p); trimmed != "" {
				ids = append(ids, trimmed)
			}
		}
		if len(ids) == 1 {
			query = query.Where("Solution.userId = ?", ids[0])
		} else if len(ids) > 1 {
			query = query.Where("Solution.userId IN ?", ids)
		}
	}

	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("Solution.challengeTitle LIKE ? OR Solution.challengeSlug LIKE ? OR Solution.code LIKE ?", searchPattern, searchPattern, searchPattern)
	}

	var totalCount int64
	query.Count(&totalCount)

	var solutions []models.Solution
	query.Order("Solution.updatedAt desc").Limit(limit).Offset(skip).Preload("User").Preload("Ratings").Find(&solutions)

	type FormattedSolution struct {
		models.Solution
		ClevernessAvg  *float64 `json:"clevernessAvg"`
		ReadabilityAvg *float64 `json:"readabilityAvg"`
		RatingsCount   int      `json:"ratingsCount"`
		Count          struct {
			Comments     int64 `json:"comments"`
			ReviewRounds int64 `json:"reviewRounds"`
		} `json:"_count"`
	}

	formatted := make([]FormattedSolution, 0, len(solutions))
	for _, sol := range solutions {
		var cAvg, rAvg *float64
		if len(sol.Ratings) > 0 {
			var cSum, rSum int
			for _, r := range sol.Ratings {
				cSum += r.Cleverness
				rSum += r.Readability
			}
			cVal := math.Round((float64(cSum)/float64(len(sol.Ratings)))*10) / 10
			rVal := math.Round((float64(rSum)/float64(len(sol.Ratings)))*10) / 10
			cAvg = &cVal
			rAvg = &rVal
		}

		var commentCount, reviewCount int64
		db.DB.Model(&models.Comment{}).Where("solutionId = ?", sol.ID).Count(&commentCount)
		db.DB.Model(&models.ReviewRound{}).Where("solutionId = ?", sol.ID).Count(&reviewCount)

		item := FormattedSolution{
			Solution:       sol,
			ClevernessAvg:  cAvg,
			ReadabilityAvg: rAvg,
			RatingsCount:   len(sol.Ratings),
		}
		item.Ratings = nil // Omit raw ratings array in list view for performance
		item.Count.Comments = commentCount
		item.Count.ReviewRounds = reviewCount

		formatted = append(formatted, item)
	}

	hasMore := (skip + len(formatted)) < int(totalCount)
	nextOffset := skip + len(formatted)

	totalPages := int(math.Ceil(float64(totalCount) / float64(limit)))
	if totalPages < 0 {
		totalPages = 0
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"solutions": formatted,
		"pagination": map[string]interface{}{
			"total":      totalCount,
			"offset":     skip,
			"limit":      limit,
			"page":       page,
			"totalPages": totalPages,
			"hasMore":    hasMore,
			"nextOffset": nextOffset,
		},
	})
}

func SolutionsGetSingleHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	id := chi.URLParam(r, "id")

	var sol models.Solution
	err := db.DB.Preload("User").
		Preload("Ratings", func(db *gorm.DB) *gorm.DB {
			return db.Preload("User", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, username")
			})
		}).
		Preload("Comments", func(db *gorm.DB) *gorm.DB {
			return db.Order("createdAt asc").Preload("User", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, username, discordAvatar, role")
			})
		}).
		Preload("ReviewRounds", func(db *gorm.DB) *gorm.DB {
			return db.Order("roundNumber asc").Preload("Reviewer", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, username, role")
			})
		}).
		Where("id = ?", id).First(&sol).Error

	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Solution not found"})
		return
	}

	var cAvg, rAvg *float64
	if len(sol.Ratings) > 0 {
		var cSum, rSum int
		for _, r := range sol.Ratings {
			cSum += r.Cleverness
			rSum += r.Readability
		}
		cVal := math.Round((float64(cSum)/float64(len(sol.Ratings)))*10) / 10
		rVal := math.Round((float64(rSum)/float64(len(sol.Ratings)))*10) / 10
		cAvg = &cVal
		rAvg = &rVal
	}

	type SingleSolutionWrapper struct {
		models.Solution
		ClevernessAvg  *float64 `json:"clevernessAvg"`
		ReadabilityAvg *float64 `json:"readabilityAvg"`
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"solution": SingleSolutionWrapper{
			Solution:       sol,
			ClevernessAvg:  cAvg,
			ReadabilityAvg: rAvg,
		},
	})
}
