package main

import (
	"log"
	"os"

	"ds-enterprises/internal/database"
	"ds-enterprises/internal/handlers"
	"ds-enterprises/internal/storage"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database
	// Use PostgreSQL if DATABASE_URL is set, otherwise use SQLite
	if os.Getenv("DATABASE_URL") != "" {
		log.Println("Using PostgreSQL database")
		if err := database.InitPostgresDB(); err != nil {
			log.Fatalf("Failed to initialize PostgreSQL: %v", err)
		}
	} else {
		log.Println("Using SQLite database")
		if err := database.InitDB("ds_enterprises.db"); err != nil {
			log.Fatalf("Failed to initialize database: %v", err)
		}
	}

	// Initialize Google Cloud Storage (optional)
	if err := storage.InitGCS(); err != nil {
		log.Printf("Warning: GCS initialization failed: %v", err)
	}
	defer storage.Close()

	// Create Gin router
	r := gin.Default()

	// Get allowed origins from environment or use defaults
	allowedOrigins := []string{"http://localhost:3000"}
	if frontendURL := os.Getenv("FRONTEND_URL"); frontendURL != "" {
		allowedOrigins = append(allowedOrigins, frontendURL)
	}
	// Allow Cloud Run URLs
	allowedOrigins = append(allowedOrigins, "https://*.run.app")

	// Configure CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		AllowOriginFunc: func(origin string) bool {
			// Allow any Cloud Run URL
			return true
		},
	}))

	// Serve uploaded files (for local development)
	r.Static("/uploads", "./uploads")

	// API Routes
	api := r.Group("/api")
	{
		// Health check
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		// Cleanup endpoint (protected by secret key, for scheduled jobs)
		api.POST("/cleanup", handlers.CleanupOldData)

		// Public auth routes
		api.POST("/auth/google", handlers.GoogleLogin)

		// Protected routes (require authentication)
		protected := api.Group("")
		protected.Use(handlers.AuthMiddleware())
		{
			// User info
			protected.GET("/auth/me", handlers.GetCurrentUser)

			// Inspection routes
			protected.POST("/inspections", handlers.CreateInspection)
			protected.GET("/inspections", handlers.GetAllInspections)
			protected.GET("/inspections/:id", handlers.GetInspection)
			protected.PUT("/inspections/:id", handlers.UpdateInspection)
			protected.DELETE("/inspections/:id", handlers.DeleteInspection)

			// Photo routes
			protected.POST("/inspections/:id/photos", handlers.UploadPhotos)
			protected.DELETE("/inspections/:id/photos/:photoId", handlers.DeletePhoto)

			// PDF generation
			protected.GET("/inspections/:id/pdf", handlers.GeneratePDF)

			// Admin-only routes
			admin := protected.Group("")
			admin.Use(handlers.AdminMiddleware())
			{
				admin.GET("/users", handlers.GetAllUsers)
				admin.POST("/users", handlers.CreateUser)
				admin.PUT("/users/:id", handlers.UpdateUser)
				admin.DELETE("/users/:id", handlers.DeleteUser)
			}
		}
	}

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
