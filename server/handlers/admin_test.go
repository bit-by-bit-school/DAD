package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"hackerrank-server/db"
	"hackerrank-server/models"
)

func setupTestDB(t *testing.T) {
	os.Setenv("DATABASE_URL", ":memory:")
	db.InitDB()
}

func TestAdminTokenHandlers(t *testing.T) {
	setupTestDB(t)

	adminUser := &models.User{
		ID:       "admin-1",
		Username: "admin_test",
		Token:    "admin-test-token",
		Role:     "ADMIN",
	}
	db.DB.Create(adminUser)

	// 1. Test AdminGetTokenSuggestionHandler
	t.Run("GetTokenSuggestion", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/admin/tokens/generate", nil)
		ctx := context.WithValue(req.Context(), UserContextKey, adminUser)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		AdminGetTokenSuggestionHandler(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", rr.Code)
		}

		var res struct {
			Token string `json:"token"`
		}
		if err := json.NewDecoder(rr.Body).Decode(&res); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		words := strings.Split(res.Token, "-")
		if len(words) < 3 || len(words) > 4 {
			t.Fatalf("suggested token %q does not have 3-4 words", res.Token)
		}
	})

	// 2. Test AdminGenerateTokenHandler with auto-generated 3-4 word token
	t.Run("GenerateTokenAuto", func(t *testing.T) {
		payload := map[string]interface{}{
			"username": "coder_auto_1",
			"role":     "USER",
		}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest("POST", "/api/admin/tokens", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		ctx := context.WithValue(req.Context(), UserContextKey, adminUser)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		AdminGenerateTokenHandler(rr, req)

		if rr.Code != http.StatusCreated {
			t.Fatalf("expected status 201, got %d: %s", rr.Code, rr.Body.String())
		}

		var res struct {
			Success bool        `json:"success"`
			User    models.User `json:"user"`
		}
		if err := json.NewDecoder(rr.Body).Decode(&res); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if res.User.Username != "coder_auto_1" {
			t.Fatalf("expected username coder_auto_1, got %s", res.User.Username)
		}

		words := strings.Split(res.User.Token, "-")
		if len(words) < 3 || len(words) > 4 {
			t.Fatalf("auto-generated token %q does not have 3-4 words", res.User.Token)
		}
	})

	// 3. Test AdminGenerateTokenHandler with manually edited / custom token
	t.Run("GenerateTokenManualCustom", func(t *testing.T) {
		customToken := "recursively-optimize-quantum-vector"
		payload := map[string]interface{}{
			"username": "coder_manual_1",
			"role":     "USER",
			"token":    customToken,
		}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest("POST", "/api/admin/tokens", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		ctx := context.WithValue(req.Context(), UserContextKey, adminUser)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		AdminGenerateTokenHandler(rr, req)

		if rr.Code != http.StatusCreated {
			t.Fatalf("expected status 201, got %d: %s", rr.Code, rr.Body.String())
		}

		var res struct {
			Success bool        `json:"success"`
			User    models.User `json:"user"`
		}
		json.NewDecoder(rr.Body).Decode(&res)

		if res.User.Token != customToken {
			t.Fatalf("expected custom token %q, got %q", customToken, res.User.Token)
		}
	})

	// 4. Test duplicate token prevention
	t.Run("PreventDuplicateToken", func(t *testing.T) {
		duplicateToken := "recursively-optimize-quantum-vector"
		payload := map[string]interface{}{
			"username": "coder_duplicate_token",
			"role":     "USER",
			"token":    duplicateToken,
		}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest("POST", "/api/admin/tokens", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		ctx := context.WithValue(req.Context(), UserContextKey, adminUser)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		AdminGenerateTokenHandler(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Fatalf("expected status 400 for duplicate token, got %d", rr.Code)
		}
	})

	// 5. Test AdminUpdateUserTokenHandler (shuffle and manual edit for existing user)
	t.Run("UpdateUserToken", func(t *testing.T) {
		var user models.User
		db.DB.Where("username = ?", "coder_manual_1").First(&user)

		newManualToken := "asynchronously-compile-neural-pipeline"
		payload := map[string]interface{}{
			"token": newManualToken,
		}
		body, _ := json.Marshal(payload)

		r := chi.NewRouter()
		r.Put("/api/admin/users/{id}/token", AdminUpdateUserTokenHandler)

		req := httptest.NewRequest("PUT", "/api/admin/users/"+user.ID+"/token", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		ctx := context.WithValue(req.Context(), UserContextKey, adminUser)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
		}

		var updated models.User
		db.DB.Where("id = ?", user.ID).First(&updated)
		if updated.Token != newManualToken {
			t.Fatalf("expected updated token %q, got %q", newManualToken, updated.Token)
		}
	})
}
