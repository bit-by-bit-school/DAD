package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"hackerrank-server/db"
	"hackerrank-server/models"
	"hackerrank-server/services"
)


func GetNotificationsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	currentUser, _ := GetUserFromContext(r.Context())

	var notifications []models.Notification
	db.DB.Order("createdAt desc").Limit(50).
		Preload("Actor", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, username, discordAvatar, role")
		}).
		Preload("Solution", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, challengeTitle, challengeSlug, language")
		}).
		Where("userId = ?", currentUser.ID).Find(&notifications)

	var unreadCount int64
	db.DB.Model(&models.Notification{}).Where("userId = ? AND isRead = ?", currentUser.ID, false).Count(&unreadCount)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"notifications": notifications,
		"unreadCount":   unreadCount,
	})
}

func MarkNotificationReadHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	id := chi.URLParam(r, "id")
	currentUser, _ := GetUserFromContext(r.Context())

	var notif models.Notification
	if err := db.DB.Where("id = ? AND userId = ?", id, currentUser.ID).First(&notif).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Notification not found."})
		return
	}

	db.DB.Model(&notif).Update("isRead", true)
	notif.IsRead = true

	var unreadCount int64
	db.DB.Model(&models.Notification{}).Where("userId = ? AND isRead = ?", currentUser.ID, false).Count(&unreadCount)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":      true,
		"notification": notif,
		"unreadCount":  unreadCount,
	})
}

func MarkAllNotificationsReadHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	currentUser, _ := GetUserFromContext(r.Context())

	db.DB.Model(&models.Notification{}).Where("userId = ? AND isRead = ?", currentUser.ID, false).Update("isRead", true)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"unreadCount": 0,
	})
}

func DeleteNotificationHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	id := chi.URLParam(r, "id")
	currentUser, _ := GetUserFromContext(r.Context())

	var notif models.Notification
	if err := db.DB.Where("id = ? AND userId = ?", id, currentUser.ID).First(&notif).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Notification not found."})
		return
	}

	db.DB.Where("id = ?", id).Delete(&models.Notification{})

	var unreadCount int64
	db.DB.Model(&models.Notification{}).Where("userId = ? AND isRead = ?", currentUser.ID, false).Count(&unreadCount)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"unreadCount": unreadCount,
	})
}

// GetVapidPublicKeyHandler returns the public VAPID key for Web Push client subscription.
func GetVapidPublicKeyHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if !services.IsWebPushConfigured() {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"enabled": false,
			"message": "Web Push is not configured (missing VAPID keys in .env)",
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"enabled":   true,
		"publicKey": services.GetVAPIDPublicKey(),
	})
}

// SubscribePushHandler registers or updates a browser push subscription for the authenticated user.
func SubscribePushHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	currentUser, ok := GetUserFromContext(r.Context())
	if !ok || currentUser == nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized."})
		return
	}

	if !services.IsWebPushConfigured() {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{"error": "Web Push is not configured on this server."})
		return
	}

	var payload struct {
		Endpoint     string `json:"endpoint"`
		Keys         struct {
			P256dh string `json:"p256dh"`
			Auth   string `json:"auth"`
		} `json:"keys"`
		Subscription *struct {
			Endpoint string `json:"endpoint"`
			Keys     struct {
				P256dh string `json:"p256dh"`
				Auth   string `json:"auth"`
			} `json:"keys"`
		} `json:"subscription"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body."})
		return
	}

	endpoint := payload.Endpoint
	p256dh := payload.Keys.P256dh
	auth := payload.Keys.Auth

	if payload.Subscription != nil {
		if endpoint == "" {
			endpoint = payload.Subscription.Endpoint
		}
		if p256dh == "" {
			p256dh = payload.Subscription.Keys.P256dh
		}
		if auth == "" {
			auth = payload.Subscription.Keys.Auth
		}
	}

	if endpoint == "" || p256dh == "" || auth == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Endpoint, p256dh, and auth keys are required."})
		return
	}

	userAgent := r.UserAgent()

	var existing models.PushSubscription
	result := db.DB.Where("endpoint = ?", endpoint).First(&existing)
	if result.Error == nil {
		// Update existing subscription
		existing.UserID = currentUser.ID
		existing.P256dh = p256dh
		existing.Auth = auth
		existing.UserAgent = userAgent
		if err := db.DB.Save(&existing).Error; err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update subscription."})
			return
		}
	} else {
		// Create new subscription
		sub := models.PushSubscription{
			ID:        uuid.New().String(),
			UserID:    currentUser.ID,
			Endpoint:  endpoint,
			P256dh:    p256dh,
			Auth:      auth,
			UserAgent: userAgent,
		}
		if err := db.DB.Create(&sub).Error; err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save subscription."})
			return
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Push subscription saved successfully.",
	})
}

// UnsubscribePushHandler removes a push subscription by endpoint.
func UnsubscribePushHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	currentUser, ok := GetUserFromContext(r.Context())
	if !ok || currentUser == nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized."})
		return
	}

	var payload struct {
		Endpoint string `json:"endpoint"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.Endpoint == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Endpoint is required."})
		return
	}

	db.DB.Where("endpoint = ? AND userId = ?", payload.Endpoint, currentUser.ID).Delete(&models.PushSubscription{})

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Push subscription removed.",
	})
}

// TestPushNotificationHandler sends an immediate test notification to the authenticated user's registered devices.
func TestPushNotificationHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	currentUser, ok := GetUserFromContext(r.Context())
	if !ok || currentUser == nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized."})
		return
	}


	if !services.IsWebPushConfigured() {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{"error": "Web Push is not configured on this server."})
		return
	}

	var count int64
	db.DB.Model(&models.PushSubscription{}).Where("userId = ?", currentUser.ID).Count(&count)
	if count == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "No active push subscriptions found for your account. Please enable desktop notifications first."})
		return
	}

	payload := services.PushPayload{
		Title: "Solutions Hub Desktop Alert",
		Body:  "Web Push notifications are connected! You will receive alerts for comments, reviews, and ratings.",
		Icon:  "/assets/icon-192.png",
		Badge: "/assets/badge-72.png",
		Tag:   "test-push-notification",
		Data: map[string]interface{}{
			"type": "TEST",
			"url":  "/",
		},
		Actions: services.DefaultPushActions(),
	}

	go services.SendPushToUser(currentUser.ID, payload)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":       true,
		"message":       "Test push notification dispatched!",
		"subscriptions": count,
	})
}

