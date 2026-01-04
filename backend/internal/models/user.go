package models

import "time"

type UserRole string

const (
	RoleAdmin UserRole = "admin"
	RoleUser  UserRole = "user"
)

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Picture   string    `json:"picture"`
	Role      UserRole  `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	CreatedBy string    `json:"created_by,omitempty"` // Admin who created this user
}

type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
}

type LoginRequest struct {
	GoogleToken string `json:"google_token" binding:"required"`
}

type LoginResponse struct {
	User  *User  `json:"user"`
	Token string `json:"token"`
}

type CreateUserRequest struct {
	Email string   `json:"email" binding:"required,email"`
	Name  string   `json:"name" binding:"required"`
	Role  UserRole `json:"role" binding:"required"`
}

type UpdateUserRequest struct {
	Name     *string   `json:"name,omitempty"`
	Role     *UserRole `json:"role,omitempty"`
	IsActive *bool     `json:"is_active,omitempty"`
}

