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
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Serve uploaded files
	r.Static("/uploads", "./uploads")

	// API Routes
	api := r.Group("/api")
	{
		// Inspection routes
		api.POST("/inspections", handlers.CreateInspection)
		api.GET("/inspections", handlers.GetAllInspections)
		api.GET("/inspections/:id", handlers.GetInspection)
		api.PUT("/inspections/:id", handlers.UpdateInspection)
		api.DELETE("/inspections/:id", handlers.DeleteInspection)

		// Photo routes
		api.POST("/inspections/:id/photos", handlers.UploadPhotos)
		api.DELETE("/inspections/:id/photos/:photoId", handlers.DeletePhoto)

		// PDF generation
		api.GET("/inspections/:id/pdf", handlers.GeneratePDF)
	}

	// Start server
	log.Println("Starting server on http://localhost:8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

