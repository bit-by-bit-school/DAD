package services

import (
	"encoding/json"
	"os"
	"testing"
)

func TestWebPushConfiguration(t *testing.T) {
	origPub := os.Getenv("VAPID_PUBLIC_KEY")
	origPriv := os.Getenv("VAPID_PRIVATE_KEY")
	origSubj := os.Getenv("VAPID_SUBJECT")
	defer func() {
		os.Setenv("VAPID_PUBLIC_KEY", origPub)
		os.Setenv("VAPID_PRIVATE_KEY", origPriv)
		os.Setenv("VAPID_SUBJECT", origSubj)
	}()

	os.Unsetenv("VAPID_PUBLIC_KEY")
	if IsWebPushConfigured() {
		t.Errorf("expected IsWebPushConfigured to be false when VAPID_PUBLIC_KEY is missing")
	}

	os.Setenv("VAPID_PUBLIC_KEY", "test_pub")
	os.Setenv("VAPID_PRIVATE_KEY", "test_priv")
	os.Setenv("VAPID_SUBJECT", "mailto:test@example.com")

	if !IsWebPushConfigured() {
		t.Errorf("expected IsWebPushConfigured to be true when all keys are set")
	}

	if GetVAPIDPublicKey() != "test_pub" {
		t.Errorf("expected GetVAPIDPublicKey to return 'test_pub', got '%s'", GetVAPIDPublicKey())
	}
}

func TestPushPayloadActions(t *testing.T) {
	payload := PushPayload{
		Title: "Test Notification",
		Body:  "Test Body",
		Actions: DefaultPushActions(),
		Data: map[string]interface{}{
			"solutionId": "sol-123",
		},
	}

	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to marshal push payload: %v", err)
	}

	var parsed PushPayload
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("failed to unmarshal push payload: %v", err)
	}

	if len(parsed.Actions) != 2 {
		t.Fatalf("expected 2 actions, got %d", len(parsed.Actions))
	}
	if parsed.Actions[0].Action != "open" || parsed.Actions[1].Action != "dismiss" {
		t.Errorf("unexpected actions: %+v", parsed.Actions)
	}
}
