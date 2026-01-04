package storage

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"time"

	"cloud.google.com/go/storage"
)

var (
	bucket     *storage.BucketHandle
	bucketName string
	client     *storage.Client
)

// InitGCS initializes Google Cloud Storage client
func InitGCS() error {
	bucketName = os.Getenv("GCS_BUCKET_NAME")
	if bucketName == "" {
		log.Println("GCS_BUCKET_NAME not set, using local storage")
		return nil
	}

	ctx := context.Background()
	var err error
	client, err = storage.NewClient(ctx)
	if err != nil {
		return fmt.Errorf("failed to create GCS client: %w", err)
	}

	bucket = client.Bucket(bucketName)
	log.Printf("GCS initialized with bucket: %s", bucketName)
	return nil
}

// IsGCSEnabled returns true if GCS is configured
func IsGCSEnabled() bool {
	return bucket != nil
}

// UploadFile uploads a file to GCS and returns the public URL
func UploadFile(localPath, remotePath string) (string, error) {
	if !IsGCSEnabled() {
		// Return local path if GCS is not configured
		return localPath, nil
	}

	ctx := context.Background()
	ctx, cancel := context.WithTimeout(ctx, time.Minute*5)
	defer cancel()

	// Open local file
	f, err := os.Open(localPath)
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer f.Close()

	// Create GCS object writer
	obj := bucket.Object(remotePath)
	wc := obj.NewWriter(ctx)

	// Set content type based on file extension
	ext := filepath.Ext(localPath)
	switch ext {
	case ".jpg", ".jpeg":
		wc.ContentType = "image/jpeg"
	case ".png":
		wc.ContentType = "image/png"
	case ".gif":
		wc.ContentType = "image/gif"
	case ".webp":
		wc.ContentType = "image/webp"
	case ".pdf":
		wc.ContentType = "application/pdf"
	default:
		wc.ContentType = "application/octet-stream"
	}

	// Copy file to GCS
	if _, err := io.Copy(wc, f); err != nil {
		return "", fmt.Errorf("failed to copy to GCS: %w", err)
	}

	if err := wc.Close(); err != nil {
		return "", fmt.Errorf("failed to close GCS writer: %w", err)
	}

	// Return the GCS URL
	url := fmt.Sprintf("https://storage.googleapis.com/%s/%s", bucketName, remotePath)
	return url, nil
}

// DeleteFile deletes a file from GCS
func DeleteFile(remotePath string) error {
	if !IsGCSEnabled() {
		// Delete local file if GCS is not configured
		return os.Remove(remotePath)
	}

	ctx := context.Background()
	ctx, cancel := context.WithTimeout(ctx, time.Second*30)
	defer cancel()

	obj := bucket.Object(remotePath)
	if err := obj.Delete(ctx); err != nil {
		return fmt.Errorf("failed to delete from GCS: %w", err)
	}

	return nil
}

// GetPublicURL returns the public URL for a file
func GetPublicURL(remotePath string) string {
	if !IsGCSEnabled() {
		return remotePath
	}
	return fmt.Sprintf("https://storage.googleapis.com/%s/%s", bucketName, remotePath)
}

// Close closes the GCS client
func Close() {
	if client != nil {
		client.Close()
	}
}

