package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"ds-enterprises/internal/database"
	"ds-enterprises/internal/models"
	"ds-enterprises/internal/pdf"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateInspection handles POST /api/inspections
func CreateInspection(c *gin.Context) {
	var req models.CreateInspectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	inspection, err := database.CreateInspection(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, inspection)
}

// GetInspection handles GET /api/inspections/:id
func GetInspection(c *gin.Context) {
	id := c.Param("id")

	inspection, err := database.GetInspectionByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inspection not found"})
		return
	}

	c.JSON(http.StatusOK, inspection)
}

// GetAllInspections handles GET /api/inspections
func GetAllInspections(c *gin.Context) {
	inspections, err := database.GetAllInspections()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if inspections == nil {
		inspections = []models.Inspection{}
	}

	c.JSON(http.StatusOK, inspections)
}

// UpdateInspection handles PUT /api/inspections/:id
func UpdateInspection(c *gin.Context) {
	id := c.Param("id")

	var req models.UpdateInspectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	inspection, err := database.UpdateInspection(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, inspection)
}

// DeleteInspection handles DELETE /api/inspections/:id
func DeleteInspection(c *gin.Context) {
	id := c.Param("id")

	if err := database.DeleteInspection(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Inspection deleted"})
}

// UploadPhotos handles POST /api/inspections/:id/photos
func UploadPhotos(c *gin.Context) {
	id := c.Param("id")

	// Verify inspection exists
	_, err := database.GetInspectionByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inspection not found"})
		return
	}

	// Create upload directory
	uploadDir := filepath.Join("uploads", id)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form"})
		return
	}

	files := form.File["photos"]
	var uploadedPhotos []models.Photo

	for _, file := range files {
		// Generate unique filename
		ext := filepath.Ext(file.Filename)
		newFileName := uuid.New().String() + ext
		filePath := filepath.Join(uploadDir, newFileName)

		// Save file
		if err := c.SaveUploadedFile(file, filePath); err != nil {
			continue
		}

		// Create photo record
		photo := models.Photo{
			InspectionID: id,
			FilePath:     "/" + filePath,
			FileName:     file.Filename,
			PhotoType:    "site",
		}

		savedPhoto, err := database.CreatePhoto(photo)
		if err != nil {
			continue
		}

		uploadedPhotos = append(uploadedPhotos, *savedPhoto)
	}

	c.JSON(http.StatusOK, gin.H{"photos": uploadedPhotos})
}

// DeletePhoto handles DELETE /api/inspections/:id/photos/:photoId
func DeletePhoto(c *gin.Context) {
	photoId := c.Param("photoId")

	if err := database.DeletePhoto(photoId); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Photo deleted"})
}

// GeneratePDF handles GET /api/inspections/:id/pdf
func GeneratePDF(c *gin.Context) {
	id := c.Param("id")

	inspection, err := database.GetInspectionByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inspection not found"})
		return
	}

	// Generate PDF
	pdfPath, err := pdf.GenerateInspectionPDF(inspection)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to generate PDF: %v", err)})
		return
	}

	// Set headers for PDF download
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=inspection_%s.pdf", id[:8]))
	c.File(pdfPath)
}

