package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"ds-enterprises/internal/database"
	"ds-enterprises/internal/models"
	"ds-enterprises/internal/pdf"
	"ds-enterprises/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var jwtSecret = []byte("ds-enterprises-secret-key-change-in-production")

// JWT Claims
type Claims struct {
	UserID string          `json:"user_id"`
	Email  string          `json:"email"`
	Role   models.UserRole `json:"role"`
	jwt.RegisteredClaims
}

// GenerateJWT creates a new JWT token for a user
func GenerateJWT(user *models.User) (string, error) {
	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * 7 * time.Hour)), // 7 days
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ValidateJWT validates a JWT token and returns the claims
func ValidateJWT(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

// AuthMiddleware validates JWT token from Authorization header
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := ValidateJWT(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Check if user is still active
		user, err := database.GetUserByID(claims.UserID)
		if err != nil || !user.IsActive {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found or inactive"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		c.Next()
	}
}

// AdminMiddleware ensures user has admin role
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("user_role")
		if !exists || role != models.RoleAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// ========== Auth Handlers ==========

// GoogleLogin handles POST /api/auth/google
func GoogleLogin(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify Google token
	googleUser, err := verifyGoogleToken(req.GoogleToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Google token: " + err.Error()})
		return
	}

	// Check if user exists in our database
	user, err := database.GetUserByEmail(googleUser.Email)
	if err != nil {
		// User not found - check if they're allowed to login
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "User not registered",
			"message": "Please contact admin to get access to the system",
		})
		return
	}

	// Check if user is active
	if !user.IsActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your account has been deactivated"})
		return
	}

	// Update user's picture from Google
	if googleUser.Picture != "" && googleUser.Picture != user.Picture {
		database.UpdateUserPicture(user.ID, googleUser.Picture)
		user.Picture = googleUser.Picture
	}

	// Generate JWT token
	token, err := GenerateJWT(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, models.LoginResponse{
		User:  user,
		Token: token,
	})
}

// verifyGoogleToken verifies the Google access token and returns user info
func verifyGoogleToken(accessToken string) (*models.GoogleUserInfo, error) {
	// Use Google's userinfo endpoint to get user data
	resp, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + accessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to verify token: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("google API error: %s", string(body))
	}

	var userInfo models.GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	return &userInfo, nil
}

// GetCurrentUser handles GET /api/auth/me
func GetCurrentUser(c *gin.Context) {
	userID, _ := c.Get("user_id")
	user, err := database.GetUserByID(userID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// ========== User Management Handlers (Admin Only) ==========

// GetAllUsers handles GET /api/users
func GetAllUsers(c *gin.Context) {
	users, err := database.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if users == nil {
		users = []models.User{}
	}

	c.JSON(http.StatusOK, users)
}

// CreateUser handles POST /api/users
func CreateUser(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate role
	if req.Role != models.RoleAdmin && req.Role != models.RoleUser {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role. Must be 'admin' or 'user'"})
		return
	}

	// Get admin's user ID
	adminID, _ := c.Get("user_id")

	user, err := database.CreateUser(req, adminID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User with this email already exists"})
		return
	}

	c.JSON(http.StatusCreated, user)
}

// UpdateUser handles PUT /api/users/:id
func UpdateUser(c *gin.Context) {
	id := c.Param("id")

	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate role if provided
	if req.Role != nil && *req.Role != models.RoleAdmin && *req.Role != models.RoleUser {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role. Must be 'admin' or 'user'"})
		return
	}

	user, err := database.UpdateUser(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

// DeleteUser handles DELETE /api/users/:id
func DeleteUser(c *gin.Context) {
	id := c.Param("id")

	// Prevent deleting yourself
	currentUserID, _ := c.Get("user_id")
	if id == currentUserID.(string) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete your own account"})
		return
	}

	if err := database.DeleteUser(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted"})
}

// ========== Inspection Handlers ==========

// CreateInspection handles POST /api/inspections
func CreateInspection(c *gin.Context) {
	var req models.CreateInspectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	userIDStr := ""
	if exists {
		userIDStr = userID.(string)
	}

	inspection, err := database.CreateInspection(req, userIDStr)
	if err != nil {
		log.Printf("CreateInspection error: %v", err)
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

	// Check if user has access (admin can see all, users only their own)
	role, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")
	
	if role != models.RoleAdmin && inspection.CreatedByUserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, inspection)
}

// GetAllInspections handles GET /api/inspections
func GetAllInspections(c *gin.Context) {
	role, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")

	var inspections []models.Inspection
	var err error

	if role == models.RoleAdmin {
		// Admin can see all inspections
		inspections, err = database.GetAllInspections()
	} else {
		// Users can only see their own inspections
		inspections, err = database.GetInspectionsByUserID(userID.(string))
	}

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

	// Check access
	inspection, err := database.GetInspectionByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inspection not found"})
		return
	}

	role, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")
	
	if role != models.RoleAdmin && inspection.CreatedByUserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var req models.UpdateInspectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updatedInspection, err := database.UpdateInspection(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, updatedInspection)
}

// DeleteInspection handles DELETE /api/inspections/:id
func DeleteInspection(c *gin.Context) {
	id := c.Param("id")

	// Check access
	inspection, err := database.GetInspectionByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inspection not found"})
		return
	}

	role, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")
	
	if role != models.RoleAdmin && inspection.CreatedByUserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	if err := database.DeleteInspection(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Inspection deleted"})
}

// UploadPhotos handles POST /api/inspections/:id/photos
func UploadPhotos(c *gin.Context) {
	id := c.Param("id")

	// Verify inspection exists and user has access
	inspection, err := database.GetInspectionByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inspection not found"})
		return
	}

	role, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")
	
	if role != models.RoleAdmin && inspection.CreatedByUserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Create local upload directory (temporary for GCS upload)
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
		localPath := filepath.Join(uploadDir, newFileName)

		// Save file locally first
		if err := c.SaveUploadedFile(file, localPath); err != nil {
			log.Printf("Failed to save file locally: %v", err)
			continue
		}

		// Determine the final file path (GCS URL or local path)
		var finalPath string
		if storage.IsGCSEnabled() {
			// Upload to GCS
			gcsPath := fmt.Sprintf("photos/%s/%s", id, newFileName)
			gcsURL, err := storage.UploadFile(localPath, gcsPath)
			if err != nil {
				log.Printf("Failed to upload to GCS: %v", err)
				// Fall back to local path
				finalPath = "/" + localPath
			} else {
				finalPath = gcsURL
				// Remove local file after successful GCS upload
				os.Remove(localPath)
			}
		} else {
			finalPath = "/" + localPath
		}

		// Create photo record
		photo := models.Photo{
			InspectionID: id,
			FilePath:     finalPath,
			FileName:     file.Filename,
			PhotoType:    "site",
		}

		savedPhoto, err := database.CreatePhoto(photo)
		if err != nil {
			log.Printf("Failed to create photo record: %v", err)
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

	// Check access
	role, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")
	
	if role != models.RoleAdmin && inspection.CreatedByUserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
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

// CleanupOldData handles POST /api/cleanup
// This endpoint is protected by a secret key for scheduled jobs
func CleanupOldData(c *gin.Context) {
	// Verify cleanup secret key
	cleanupKey := c.GetHeader("X-Cleanup-Key")
	expectedKey := os.Getenv("CLEANUP_SECRET_KEY")
	
	if expectedKey == "" {
		expectedKey = "ds-enterprises-cleanup-secret-2024" // Default for development
	}
	
	if cleanupKey != expectedKey {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid cleanup key"})
		return
	}
	
	// Default to 60 days (2 months)
	daysOld := 60
	
	// Allow override via query parameter
	if days := c.Query("days"); days != "" {
		if d, err := fmt.Sscanf(days, "%d", &daysOld); err == nil && d > 0 {
			// Use parsed value
		}
	}
	
	log.Printf("Starting cleanup of data older than %d days", daysOld)
	
	// Delete old inspections from database
	deletedCount, err := database.CleanupOldInspections(daysOld)
	if err != nil {
		log.Printf("Cleanup error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Cleanup failed: %v", err)})
		return
	}
	
	// Delete photos from GCS
	photoPaths := database.GetLastDeletedPhotoPaths()
	gcsDeletedCount := 0
	
	if storage.IsGCSEnabled() {
		for _, path := range photoPaths {
			// Extract GCS path from URL
			if strings.Contains(path, "storage.googleapis.com") {
				// Parse the GCS path
				parts := strings.Split(path, "/")
				if len(parts) >= 2 {
					gcsPath := strings.Join(parts[len(parts)-2:], "/")
					if err := storage.DeleteFile(gcsPath); err != nil {
						log.Printf("Failed to delete GCS file %s: %v", gcsPath, err)
					} else {
						gcsDeletedCount++
					}
				}
			}
		}
	}
	
	log.Printf("Cleanup complete: %d inspections deleted, %d GCS files deleted", deletedCount, gcsDeletedCount)
	
	c.JSON(http.StatusOK, gin.H{
		"message":             "Cleanup completed successfully",
		"inspections_deleted": deletedCount,
		"photos_deleted":      gcsDeletedCount,
		"days_threshold":      daysOld,
	})
}
