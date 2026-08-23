package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"hackerrank-server/db"
	"hackerrank-server/models"
	"hackerrank-server/services"
)

func AdminGetUsersHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var users []models.User
	db.DB.Order("createdAt desc").Find(&users)

	type AdminUserItem struct {
		ID              string  `json:"id"`
		Username        string  `json:"username"`
		Token           string  `json:"token"`
		DiscordID       *string `json:"discordId,omitempty"`
		DiscordUsername *string `json:"discordUsername,omitempty"`
		DiscordAvatar   *string `json:"discordAvatar,omitempty"`
		Role            string  `json:"role"`
		CreatedAt       string  `json:"createdAt"`
		Count           struct {
			Solutions int64 `json:"solutions"`
			Comments  int64 `json:"comments"`
			Ratings   int64 `json:"ratings"`
		} `json:"_count"`
	}

	result := make([]AdminUserItem, 0, len(users))
	for _, u := range users {
		var solCount, commentCount, ratingCount int64
		db.DB.Model(&models.Solution{}).Where("userId = ?", u.ID).Count(&solCount)
		db.DB.Model(&models.Comment{}).Where("userId = ?", u.ID).Count(&commentCount)
		db.DB.Model(&models.Rating{}).Where("userId = ?", u.ID).Count(&ratingCount)

		item := AdminUserItem{
			ID:              u.ID,
			Username:        u.Username,
			Token:           u.Token,
			DiscordID:       u.DiscordID,
			DiscordUsername: u.DiscordUsername,
			DiscordAvatar:   u.DiscordAvatar,
			Role:            u.Role,
			CreatedAt:       u.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
		}
		item.Count.Solutions = solCount
		item.Count.Comments = commentCount
		item.Count.Ratings = ratingCount
		result = append(result, item)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"users": result})
}

func AdminGetTokenSuggestionHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	suggestedToken := services.GenerateUniqueTechToken(db.DB)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": suggestedToken,
	})
}

func AdminGenerateTokenHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var payload struct {
		Username        string  `json:"username"`
		Role            string  `json:"role"`
		DiscordUsername *string `json:"discordUsername"`
		Token           *string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || strings.TrimSpace(payload.Username) == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Username is required"})
		return
	}

	username := strings.TrimSpace(payload.Username)
	role := "USER"
	if strings.ToUpper(payload.Role) == "ADMIN" {
		role = "ADMIN"
	}

	var token string
	if payload.Token != nil && strings.TrimSpace(*payload.Token) != "" {
		token = strings.TrimSpace(*payload.Token)
	} else {
		token = services.GenerateUniqueTechToken(db.DB)
	}

	var existing models.User
	if db.DB.Where("username = ?", username).First(&existing).Error == nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Username \"%s\" already exists.", username)})
		return
	}

	var existingToken models.User
	if db.DB.Where("token = ?", token).First(&existingToken).Error == nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Token \"%s\" is already assigned to @%s. Please choose or shuffle a different token.", token, existingToken.Username)})
		return
	}

	var dName *string
	if payload.DiscordUsername != nil && strings.TrimSpace(*payload.DiscordUsername) != "" {
		trimmed := strings.TrimSpace(*payload.DiscordUsername)
		dName = &trimmed
	}

	user := models.User{
		ID:              uuid.New().String(),
		Username:        username,
		Token:           token,
		Role:            role,
		DiscordUsername: dName,
	}

	if err := db.DB.Create(&user).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    user,
	})
}

func AdminUpdateUserTokenHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	targetID := chi.URLParam(r, "id")

	var user models.User
	if err := db.DB.Where("id = ?", targetID).First(&user).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "User not found"})
		return
	}

	var payload struct {
		Token *string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	var newToken string
	if payload.Token != nil && strings.TrimSpace(*payload.Token) != "" {
		newToken = strings.TrimSpace(*payload.Token)
	} else {
		newToken = services.GenerateUniqueTechToken(db.DB)
	}

	var existingToken models.User
	if db.DB.Where("token = ? AND id != ?", newToken, targetID).First(&existingToken).Error == nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Token \"%s\" is already assigned to @%s. Please choose or shuffle a different token.", newToken, existingToken.Username)})
		return
	}

	if err := db.DB.Model(&user).Update("token", newToken).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	user.Token = newToken
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    user,
	})
}

func AdminAdvanceMapDiscordHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var payload struct {
		UserID          string `json:"userId"`
		DiscordUsername string `json:"discordUsername"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.UserID == "" || strings.TrimSpace(payload.DiscordUsername) == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "userId and discordUsername are required"})
		return
	}

	var user models.User
	if err := db.DB.Where("id = ?", payload.UserID).First(&user).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "User not found"})
		return
	}

	dName := strings.TrimSpace(payload.DiscordUsername)
	db.DB.Model(&user).Update("discordUsername", dName)
	user.DiscordUsername = &dName

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    user,
	})
}

func AdminGetUnmappedDiscordsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var unmapped []models.UnmappedDiscord
	db.DB.Order("loggedInAt desc").Find(&unmapped)

	json.NewEncoder(w).Encode(map[string]interface{}{"unmapped": unmapped})
}

func AdminMapDiscordHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var payload struct {
		DiscordID string `json:"discordId"`
		UserID    string `json:"userId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.DiscordID == "" || payload.UserID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "discordId and userId are required"})
		return
	}

	var unmapped models.UnmappedDiscord
	if err := db.DB.Where("discordId = ?", payload.DiscordID).First(&unmapped).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unmapped Discord entry not found."})
		return
	}

	var user models.User
	if err := db.DB.Where("id = ?", payload.UserID).First(&user).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "User not found"})
		return
	}

	db.DB.Model(&user).Updates(map[string]interface{}{
		"discordId":       unmapped.DiscordID,
		"discordUsername": unmapped.DiscordUsername,
		"discordAvatar":   unmapped.DiscordAvatar,
	})
	user.DiscordID = &unmapped.DiscordID
	user.DiscordUsername = &unmapped.DiscordUsername
	user.DiscordAvatar = unmapped.DiscordAvatar

	db.DB.Where("discordId = ?", payload.DiscordID).Delete(&models.UnmappedDiscord{})

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    user,
	})
}

func AdminDeleteUserHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	targetID := chi.URLParam(r, "id")

	currentUser, _ := GetUserFromContext(r.Context())
	if currentUser != nil && currentUser.ID == targetID {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "You cannot delete your own admin account."})
		return
	}

	if err := db.DB.Where("id = ?", targetID).Delete(&models.User{}).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
