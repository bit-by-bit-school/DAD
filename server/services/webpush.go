package services

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/SherClockHolmes/webpush-go"
	"hackerrank-server/db"
	"hackerrank-server/models"
)

type PushAction struct {
	Action string `json:"action"`
	Title  string `json:"title"`
}

type PushPayload struct {
	Title   string                 `json:"title"`
	Body    string                 `json:"body"`
	Icon    string                 `json:"icon"`
	Badge   string                 `json:"badge"`
	Tag     string                 `json:"tag,omitempty"`
	Data    map[string]interface{} `json:"data,omitempty"`
	Actions []PushAction           `json:"actions,omitempty"`
}

func DefaultPushActions() []PushAction {
	return []PushAction{
		{Action: "open", Title: "Open Solution"},
		{Action: "dismiss", Title: "Dismiss"},
	}
}

// IsWebPushConfigured returns true if all required VAPID environment variables are set.
func IsWebPushConfigured() bool {
	pub := strings.TrimSpace(os.Getenv("VAPID_PUBLIC_KEY"))
	priv := strings.TrimSpace(os.Getenv("VAPID_PRIVATE_KEY"))
	subj := strings.TrimSpace(os.Getenv("VAPID_SUBJECT"))
	return pub != "" && priv != "" && subj != ""
}

// GetVAPIDPublicKey returns the public VAPID key for client push registration.
func GetVAPIDPublicKey() string {
	return strings.TrimSpace(os.Getenv("VAPID_PUBLIC_KEY"))
}

func getVAPIDSubject() string {
	subj := strings.TrimSpace(os.Getenv("VAPID_SUBJECT"))
	if subj == "" {
		subj = "mailto:admin@solutionshub.local"
	}
	return subj
}

// SendPushToUser sends a push notification payload to all active subscriptions of a given user.
func SendPushToUser(userID string, payload PushPayload) {
	if !IsWebPushConfigured() {
		log.Printf("[WebPush] Skipping push to user %s: VAPID keys not configured in .env", userID)
		return
	}

	if payload.Icon == "" {
		payload.Icon = "/assets/icon-192.png"
	}
	if payload.Badge == "" {
		payload.Badge = "/assets/badge-72.png"
	}
	if len(payload.Actions) == 0 {
		payload.Actions = DefaultPushActions()
	}

	var subs []models.PushSubscription
	if err := db.DB.Where("userId = ?", userID).Find(&subs).Error; err != nil {
		log.Printf("[WebPush] Failed to query subscriptions for user %s: %v", userID, err)
		return
	}

	if len(subs) == 0 {
		log.Printf("[WebPush] User %s has no active push subscriptions", userID)
		return
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[WebPush] Failed to marshal push payload: %v", err)
		return
	}

	var wg sync.WaitGroup
	for _, s := range subs {
		wg.Add(1)
		go func(sub models.PushSubscription) {
			defer wg.Done()
			sendNotificationToEndpoint(sub, payloadJSON)
		}(s)
	}
	wg.Wait()
}

// sendNotificationToEndpoint encrypts and sends a Web Push message to an endpoint.
// It auto-prunes invalid or expired subscriptions (HTTP 404 or 410).
func sendNotificationToEndpoint(sub models.PushSubscription, payloadJSON []byte) {
	subscription := &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys: webpush.Keys{
			P256dh: sub.P256dh,
			Auth:   sub.Auth,
		},
	}

	resp, err := webpush.SendNotification(payloadJSON, subscription, &webpush.Options{
		Subscriber:      getVAPIDSubject(),
		VAPIDPublicKey:  GetVAPIDPublicKey(),
		VAPIDPrivateKey: strings.TrimSpace(os.Getenv("VAPID_PRIVATE_KEY")),
		TTL:             3600,
	})

	if err != nil {
		log.Printf("[WebPush] Error sending push to endpoint %s: %v", sub.Endpoint, err)
	}

	if resp != nil {
		defer resp.Body.Close()
		// Prune subscription if it has expired or been revoked
		if resp.StatusCode == http.StatusGone || resp.StatusCode == http.StatusNotFound {
			log.Printf("[WebPush] Subscription expired or gone (status %d). Pruning endpoint %s", resp.StatusCode, sub.Endpoint)
			db.DB.Where("id = ?", sub.ID).Delete(&models.PushSubscription{})
		} else if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			log.Printf("[WebPush] Push sent successfully to endpoint (status %d)", resp.StatusCode)
		} else {
			log.Printf("[WebPush] Push returned non-200 response (status %d) for endpoint %s", resp.StatusCode, sub.Endpoint)
		}
	}
}

// SendSinglePush sends a push notification to a specific subscription (useful for testing).
func SendSinglePush(sub models.PushSubscription, payload PushPayload) error {
	if !IsWebPushConfigured() {
		return fmt.Errorf("Web Push is not configured: missing VAPID keys in .env")
	}

	if payload.Icon == "" {
		payload.Icon = "/assets/icon-192.png"
	}
	if payload.Badge == "" {
		payload.Badge = "/assets/badge-72.png"
	}
	if len(payload.Actions) == 0 {
		payload.Actions = DefaultPushActions()
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal push payload: %w", err)
	}

	subscription := &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys: webpush.Keys{
			P256dh: sub.P256dh,
			Auth:   sub.Auth,
		},
	}

	resp, err := webpush.SendNotification(payloadJSON, subscription, &webpush.Options{
		Subscriber:      getVAPIDSubject(),
		VAPIDPublicKey:  GetVAPIDPublicKey(),
		VAPIDPrivateKey: strings.TrimSpace(os.Getenv("VAPID_PRIVATE_KEY")),
		TTL:             3600,
	})

	if err != nil {
		return err
	}
	if resp != nil {
		defer resp.Body.Close()
		if resp.StatusCode == http.StatusGone || resp.StatusCode == http.StatusNotFound {
			db.DB.Where("id = ?", sub.ID).Delete(&models.PushSubscription{})
			return fmt.Errorf("subscription expired (status %d)", resp.StatusCode)
		}
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return fmt.Errorf("push service returned status %d", resp.StatusCode)
		}
	}
	return nil
}
