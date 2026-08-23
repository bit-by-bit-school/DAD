package main

import (
	"bufio"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"hackerrank-server/db"
	"hackerrank-server/handlers"
)

func loadDotEnv(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			val = strings.Trim(val, `"'`)
			if os.Getenv(key) == "" {
				os.Setenv(key, val)
			}
		}
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	loadDotEnv(".env")
	loadDotEnv("../.env")

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	// Initialize GORM & SQLite
	db.InitDB()

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)

	// Public Auth routes
	r.Post("/api/auth/verify-token", handlers.VerifyTokenHandler)
	r.Get("/api/auth/discord/login", handlers.DiscordLoginHandler)
	r.Get("/api/auth/discord/callback", handlers.DiscordCallbackHandler)

	// Public Users directory
	r.Get("/api/users", handlers.GetUsersListPublicHandler)

	// Public Problem Statements
	r.Get("/api/problems/{slug}", handlers.ProblemGetHandler)

	// Admin routes (Require Auth + Admin)
	r.Route("/api/admin", func(r chi.Router) {
		r.Use(handlers.AuthenticateMiddleware)
		r.Use(handlers.RequireAdminMiddleware)

		r.Get("/users", handlers.AdminGetUsersHandler)
		r.Get("/tokens/generate", handlers.AdminGetTokenSuggestionHandler)
		r.Post("/tokens", handlers.AdminGenerateTokenHandler)
		r.Put("/users/{id}/token", handlers.AdminUpdateUserTokenHandler)
		r.Post("/advance-map-discord", handlers.AdminAdvanceMapDiscordHandler)
		r.Get("/unmapped-discords", handlers.AdminGetUnmappedDiscordsHandler)
		r.Post("/map-discord", handlers.AdminMapDiscordHandler)
		r.Delete("/users/{id}", handlers.AdminDeleteUserHandler)
	})

	// Solutions routes
	r.Route("/api/solutions", func(r chi.Router) {
		r.Get("/users", handlers.SolutionsGetUsersHandler)
		r.Get("/problem/{slug}", handlers.ProblemGetHandler)
		r.Get("/", handlers.SolutionsListHandler)

		// Authenticated solution operations
		r.Group(func(r chi.Router) {
			r.Use(handlers.AuthenticateMiddleware)

			r.Post("/sync", handlers.SolutionsSyncHandler)
			r.Post("/{id}/rate", handlers.RateSolutionHandler)
			r.Post("/{id}/comments", handlers.CreateCommentHandler)

			// Code Reviews
			r.Get("/{id}/reviews", handlers.GetReviewsHandler)
			r.Get("/{id}/review/prompt", handlers.GetReviewPromptHandler)
			r.Post("/{id}/review/publish", handlers.PublishReviewHandler)
		})

		r.Get("/{id}", handlers.SolutionsGetSingleHandler)
	})

	// Comments direct routes
	r.Route("/api/comments", func(r chi.Router) {
		r.Use(handlers.AuthenticateMiddleware)
		r.Delete("/{commentId}", handlers.DeleteCommentHandler)
	})

	// Notifications
	r.Route("/api/notifications", func(r chi.Router) {
		r.Use(handlers.AuthenticateMiddleware)
		r.Get("/", handlers.GetNotificationsHandler)
		r.Patch("/{id}/read", handlers.MarkNotificationReadHandler)
		r.Post("/read-all", handlers.MarkAllNotificationsReadHandler)
		r.Delete("/{id}", handlers.DeleteNotificationHandler)
	})

	// Feedback endpoints
	r.Post("/api/feedback", handlers.SaveFeedbackHandler)
	r.Get("/api/feedback", handlers.ListFeedbackHandler)
	r.Delete("/api/feedback", handlers.ClearFeedbackHandler)

	// Static SPA File Server
	publicDir := "public"
	if _, err := os.Stat(publicDir); os.IsNotExist(err) {
		publicDir = "../public"
	}

	workDir, _ := os.Getwd()
	filesDir := http.Dir(filepath.Join(workDir, publicDir))

	fileServer := http.FileServer(filesDir)

	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Join(workDir, publicDir, filepath.Clean(r.URL.Path))
		info, err := os.Stat(path)
		if err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}
		// Fallback to index.html for SPA
		http.ServeFile(w, r, filepath.Join(workDir, publicDir, "index.html"))
	})

	fmt.Println("=======================================================")
	fmt.Printf("🚀 HackerRank Solutions Hub High-Performance Go Server Running!\n")
	fmt.Printf("🌐 Dashboard URL: http://localhost:%s\n", port)
	fmt.Printf("🔑 Master Admin Token: hr_admin_master_token_2026\n")
	fmt.Println("=======================================================")

	log.Fatal(http.ListenAndServe(":"+port, r))
}
