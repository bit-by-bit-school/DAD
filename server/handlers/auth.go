package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

	"hackerrank-server/db"
	"hackerrank-server/models"
)

type contextKey string

const UserContextKey contextKey = "user"

func GetUserFromContext(ctx context.Context) (*models.User, bool) {
	u, ok := ctx.Value(UserContextKey).(*models.User)
	return u, ok
}

func AuthenticateMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		tokenParam := r.URL.Query().Get("token")
		token := ""

		if strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(authHeader, "Bearer ")
		} else if tokenParam != "" {
			token = tokenParam
		}

		if token == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Authentication token required."})
			return
		}

		var user models.User
		if err := db.DB.Where("token = ?", token).First(&user).Error; err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid authentication token."})
			return
		}

		ctx := context.WithValue(r.Context(), UserContextKey, &user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func VerifyTokenHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var payload struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.Token == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Token is required"})
		return
	}

	var user models.User
	if err := db.DB.Where("token = ?", payload.Token).First(&user).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Token not found or invalid"})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    user,
	})
}

func DiscordLoginHandler(w http.ResponseWriter, r *http.Request) {
	clientID := os.Getenv("DISCORD_CLIENT_ID")
	redirectURI := os.Getenv("DISCORD_REDIRECT_URI")
	if redirectURI == "" {
		redirectURI = "http://localhost:3000/api/auth/discord/callback"
	}

	if clientID == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Discord OAuth is not configured on this local server. Please set DISCORD_CLIENT_ID in server/.env."))
		return
	}

	discordAuthURL := fmt.Sprintf("https://discord.com/oauth2/authorize?client_id=%s&response_type=code&redirect_uri=%s&scope=identify",
		clientID, url.QueryEscape(redirectURI))
	http.Redirect(w, r, discordAuthURL, http.StatusFound)
}

func DiscordCallbackHandler(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Redirect(w, r, "/?error=No code provided from Discord", http.StatusFound)
		return
	}

	clientID := os.Getenv("DISCORD_CLIENT_ID")
	clientSecret := os.Getenv("DISCORD_CLIENT_SECRET")
	redirectURI := os.Getenv("DISCORD_REDIRECT_URI")
	if redirectURI == "" {
		redirectURI = "http://localhost:3000/api/auth/discord/callback"
	}

	data := url.Values{}
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", redirectURI)

	resp, err := http.Post("https://discord.com/api/oauth2/token", "application/x-www-form-urlencoded", strings.NewReader(data.Encode()))
	if err != nil {
		http.Redirect(w, r, fmt.Sprintf("/?error=%s", url.QueryEscape("Discord login failed: "+err.Error())), http.StatusFound)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var tokenResp struct {
		AccessToken string `json:"access_token"`
	}
	json.Unmarshal(body, &tokenResp)

	if tokenResp.AccessToken == "" {
		http.Redirect(w, r, "/?error=Failed to acquire Discord access token", http.StatusFound)
		return
	}

	// Fetch Discord profile
	userReq, _ := http.NewRequest("GET", "https://discord.com/api/users/@me", nil)
	userReq.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)

	client := &http.Client{}
	userResp, err := client.Do(userReq)
	if err != nil {
		http.Redirect(w, r, fmt.Sprintf("/?error=%s", url.QueryEscape("Discord profile fetch failed")), http.StatusFound)
		return
	}
	defer userResp.Body.Close()

	userBody, _ := io.ReadAll(userResp.Body)
	var dUser struct {
		ID            string `json:"id"`
		Username      string `json:"username"`
		Discriminator string `json:"discriminator"`
		Avatar        string `json:"avatar"`
	}
	json.Unmarshal(userBody, &dUser)

	discordUsername := dUser.Username
	if dUser.Discriminator != "" && dUser.Discriminator != "0" {
		discordUsername = fmt.Sprintf("%s#%s", dUser.Username, dUser.Discriminator)
	}

	var discordAvatar *string
	if dUser.Avatar != "" {
		url := fmt.Sprintf("https://cdn.discordapp.com/avatars/%s/%s.png", dUser.ID, dUser.Avatar)
		discordAvatar = &url
	}

	var user models.User
	err = db.DB.Where("discordId = ? OR discordUsername = ? OR discordUsername = ?", dUser.ID, discordUsername, dUser.Username).First(&user).Error

	if err == nil {
		// Found! Update missing fields
		updates := map[string]interface{}{}
		if user.DiscordID == nil || *user.DiscordID != dUser.ID {
			updates["discordId"] = dUser.ID
		}
		if user.DiscordUsername == nil || *user.DiscordUsername != discordUsername {
			updates["discordUsername"] = discordUsername
		}
		if discordAvatar != nil && (user.DiscordAvatar == nil || *user.DiscordAvatar != *discordAvatar) {
			updates["discordAvatar"] = *discordAvatar
		}
		if len(updates) > 0 {
			db.DB.Model(&user).Updates(updates)
		}
		http.Redirect(w, r, fmt.Sprintf("/?token=%s&login=discord_success", url.QueryEscape(user.Token)), http.StatusFound)
		return
	}

	// Upsert into UnmappedDiscord
	var unmapped models.UnmappedDiscord
	if db.DB.Where("discordId = ?", dUser.ID).First(&unmapped).Error != nil {
		unmapped = models.UnmappedDiscord{
			ID:              dUser.ID,
			DiscordID:       dUser.ID,
			DiscordUsername: discordUsername,
			DiscordAvatar:   discordAvatar,
		}
		db.DB.Create(&unmapped)
	} else {
		db.DB.Model(&unmapped).Updates(map[string]interface{}{
			"discordUsername": discordUsername,
			"discordAvatar":   discordAvatar,
		})
	}

	http.Redirect(w, r, fmt.Sprintf("/?discord_unmapped=true&discordId=%s&discordUsername=%s",
		url.QueryEscape(dUser.ID), url.QueryEscape(discordUsername)), http.StatusFound)
}

func RequireAdminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := GetUserFromContext(r.Context())
		if !ok || user.Role != "ADMIN" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"error": "Access denied. Admin privileges required."})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func GetUsersListPublicHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var users []models.User
	db.DB.Order("username asc").Find(&users)

	type UserItem struct {
		ID            string  `json:"id"`
		Username      string  `json:"username"`
		DiscordAvatar *string `json:"discordAvatar,omitempty"`
		Role          string  `json:"role"`
		Count         struct {
			Solutions int64 `json:"solutions"`
		} `json:"_count"`
	}

	result := make([]UserItem, 0, len(users))
	for _, u := range users {
		var solCount int64
		db.DB.Model(&models.Solution{}).Where("userId = ?", u.ID).Count(&solCount)

		item := UserItem{
			ID:            u.ID,
			Username:      u.Username,
			DiscordAvatar: u.DiscordAvatar,
			Role:          u.Role,
		}
		item.Count.Solutions = solCount
		result = append(result, item)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"users": result})
}
