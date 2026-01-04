package main

import (
	"log"

	"ds-enterprises/internal/database"
	"ds-enterprises/internal/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database
	if err := database.InitDB("ds_enterprises.db"); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Create Gin router
	r := gin.Default()

	// Configure CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Serve uploaded files
	r.Static("/uploads", "./uploads")

	// API Routes
	api := r.Group("/api")
	{
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

	// Start server
	log.Println("Starting server on http://localhost:8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
