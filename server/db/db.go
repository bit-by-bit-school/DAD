package db

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"hackerrank-server/models"
)

var DB *gorm.DB

func InitDB() *gorm.DB {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "dev.db"
	} else {
		// Clean file: prefix if present in env (e.g. file:./dev.db -> ./dev.db)
		dbURL = strings.TrimPrefix(dbURL, "file:")
	}

	var err error
	DB, err = gorm.Open(sqlite.Open(dbURL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Enable WAL mode & foreign keys in SQLite
	DB.Exec("PRAGMA journal_mode=WAL;")
	DB.Exec("PRAGMA foreign_keys=ON;")

	// Auto-migrate tables
	err = DB.AutoMigrate(
		&models.User{},
		&models.UnmappedDiscord{},
		&models.Solution{},
		&models.Rating{},
		&models.Comment{},
		&models.ReviewRound{},
		&models.Notification{},
	)
	if err != nil {
		log.Fatalf("Failed to auto-migrate database: %v", err)
	}

	// Normalize legacy platforms
	DB.Exec("UPDATE Solution SET platform = 'hackerrank' WHERE platform IS NULL OR platform = '';")

	SeedAdmin()

	return DB
}

func SeedAdmin() {
	adminToken := "hr_admin_master_token_2026"
	adminUsername := "admin"

	var existingAdmin models.User
	result := DB.Where("token = ?", adminToken).First(&existingAdmin)
	if result.Error != nil {
		admin := models.User{
			ID:       uuid.New().String(),
			Username: adminUsername,
			Token:    adminToken,
			Role:     "ADMIN",
		}
		if err := DB.Create(&admin).Error; err != nil {
			log.Printf("Error creating default admin: %v", err)
		} else {
			fmt.Printf("✅ Default Admin created successfully! (Username: %s, Role: %s, Token: %s)\n", admin.Username, admin.Role, admin.Token)
		}
	} else {
		fmt.Printf("ℹ️ Admin account already exists (Token: %s)\n", existingAdmin.Token)
	}
}
