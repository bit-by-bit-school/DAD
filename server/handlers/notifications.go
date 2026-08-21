package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
	"hackerrank-server/db"
	"hackerrank-server/models"
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
