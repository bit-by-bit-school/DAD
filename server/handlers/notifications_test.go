package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"hackerrank-server/db"
	"hackerrank-server/models"
)

func setupNotificationTestDB(t *testing.T) {
	var err error
	db.DB, err = gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("failed to open in-memory db: %v", err)
	}

	err = db.DB.AutoMigrate(
		&models.User{},
		&models.PushSubscription{},
		&models.Notification{},
	)
	if err != nil {
		t.Fatalf("failed to auto migrate: %v", err)
	}
}

func TestGetVapidPublicKeyHandler(t *testing.T) {
	origPub := os.Getenv("VAPID_PUBLIC_KEY")
	origPriv := os.Getenv("VAPID_PRIVATE_KEY")
	origSubj := os.Getenv("VAPID_SUBJECT")
	defer func() {
		os.Setenv("VAPID_PUBLIC_KEY", origPub)
		os.Setenv("VAPID_PRIVATE_KEY", origPriv)
		os.Setenv("VAPID_SUBJECT", origSubj)
	}()

	os.Setenv("VAPID_PUBLIC_KEY", "test_public_vapid_key_12345")
	os.Setenv("VAPID_PRIVATE_KEY", "test_private_vapid_key")
	os.Setenv("VAPID_SUBJECT", "mailto:test@example.com")

	req := httptest.NewRequest("GET", "/api/notifications/vapid-public-key", nil)
	w := httptest.NewRecorder()

	GetVapidPublicKeyHandler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var res map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if res["enabled"] != true {
		t.Fatalf("expected enabled true, got %v", res["enabled"])
	}
	if res["publicKey"] != "test_public_vapid_key_12345" {
		t.Fatalf("expected publicKey 'test_public_vapid_key_12345', got %v", res["publicKey"])
	}
}

func TestSubscribeAndUnsubscribePushHandler(t *testing.T) {
	setupNotificationTestDB(t)

	os.Setenv("VAPID_PUBLIC_KEY", "test_pub")
	os.Setenv("VAPID_PRIVATE_KEY", "test_priv")
	os.Setenv("VAPID_SUBJECT", "mailto:test@example.com")

	testUser := models.User{
		ID:       uuid.New().String(),
		Username: "testuser",
		Role:     "USER",
	}
	db.DB.Create(&testUser)

	ctx := context.WithValue(context.Background(), UserContextKey, &testUser)

	// 1. Subscribe without body should fail
	reqBad := httptest.NewRequest("POST", "/api/notifications/subscribe", bytes.NewReader([]byte("{}"))).WithContext(ctx)
	wBad := httptest.NewRecorder()
	SubscribePushHandler(wBad, reqBad)
	if wBad.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for empty body, got %d", wBad.Code)
	}

	// 2. Subscribe with valid payload
	subPayload := map[string]interface{}{
		"endpoint": "https://fcm.googleapis.com/fcm/send/test-sub-token-123",
		"keys": map[string]string{
			"p256dh": "test_p256dh_key",
			"auth":   "test_auth_secret",
		},
	}
	body, _ := json.Marshal(subPayload)
	reqOk := httptest.NewRequest("POST", "/api/notifications/subscribe", bytes.NewReader(body)).WithContext(ctx)
	wOk := httptest.NewRecorder()
	SubscribePushHandler(wOk, reqOk)

	if wOk.Code != http.StatusOK {
		t.Fatalf("expected 200 for subscribe, got %d: %s", wOk.Code, wOk.Body.String())
	}

	var count int64
	db.DB.Model(&models.PushSubscription{}).Where("userId = ?", testUser.ID).Count(&count)
	if count != 1 {
		t.Fatalf("expected 1 subscription saved, got %d", count)
	}

	// 3. Unsubscribe
	unsubPayload := map[string]string{
		"endpoint": "https://fcm.googleapis.com/fcm/send/test-sub-token-123",
	}
	unsubBody, _ := json.Marshal(unsubPayload)
	reqUnsub := httptest.NewRequest("POST", "/api/notifications/unsubscribe", bytes.NewReader(unsubBody)).WithContext(ctx)
	wUnsub := httptest.NewRecorder()
	UnsubscribePushHandler(wUnsub, reqUnsub)

	if wUnsub.Code != http.StatusOK {
		t.Fatalf("expected 200 for unsubscribe, got %d", wUnsub.Code)
	}

	db.DB.Model(&models.PushSubscription{}).Where("userId = ?", testUser.ID).Count(&count)
	if count != 0 {
		t.Fatalf("expected 0 subscriptions after unsubscribe, got %d", count)
	}
}
