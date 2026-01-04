package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"ds-enterprises/internal/models"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// InitPostgresDB initializes PostgreSQL database connection
func InitPostgresDB() error {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return fmt.Errorf("DATABASE_URL environment variable is required")
	}

	var err error
	DB, err = sql.Open("postgres", dbURL)
	if err != nil {
		return err
	}

	// Test connection
	if err := DB.Ping(); err != nil {
		return err
	}

	// Create tables
	if err := createPostgresTables(); err != nil {
		return err
	}

	// Seed initial admin
	if err := seedInitialAdminPostgres(); err != nil {
		log.Printf("Warning: Could not seed initial admin: %v", err)
	}

	isPostgres = true
	log.Println("PostgreSQL database initialized successfully")
	return nil
}

func createPostgresTables() error {
	usersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		email TEXT UNIQUE NOT NULL,
		name TEXT NOT NULL,
		picture TEXT,
		role TEXT NOT NULL DEFAULT 'user',
		is_active BOOLEAN NOT NULL DEFAULT true,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		created_by TEXT
	);`

	inspectionsTable := `
	CREATE TABLE IF NOT EXISTS inspections (
		id TEXT PRIMARY KEY,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		status TEXT DEFAULT 'draft',
		
		employee_name TEXT,
		location TEXT,
		inspection_date TEXT,
		person_visited TEXT,
		
		type_of_case TEXT,
		bank_name TEXT,
		applicant_name TEXT,
		project_name TEXT,
		property_address TEXT,
		landmark TEXT,
		person_met_at_site TEXT,
		relation_with_applicant TEXT,
		
		boundary_east TEXT,
		boundary_west TEXT,
		boundary_north TEXT,
		boundary_south TEXT,
		approach_road TEXT,
		road_width TEXT,
		road_width_unit TEXT,
		
		num_floors TEXT,
		total_buildings TEXT,
		num_wings TEXT,
		total_flats TEXT,
		per_floor_flats TEXT,
		flat_type TEXT,
		carpet_area TEXT,
		super_built_up_area TEXT,
		
		occupancy_status TEXT,
		occupant_name TEXT,
		occupied_since TEXT,
		building_occupancy_percent TEXT,
		
		age_of_building TEXT,
		surrounding_development_percent TEXT,
		num_lifts TEXT,
		
		approx_rent TEXT,
		market_rate TEXT,
		
		distance_railway TEXT,
		distance_bus TEXT,
		distance_hospital TEXT,
		
		flooring_type TEXT,
		kitchen_platform TEXT,
		wall_tiles_kitchen TEXT,
		wall_tiles_toilet TEXT,
		windows_type TEXT,
		ms_grill TEXT,
		
		rcc_work TEXT,
		brick_work TEXT,
		internal_plaster TEXT,
		external_plaster TEXT,
		flooring_work TEXT,
		window_door_fitting TEXT,
		painting_finishing TEXT,
		labours_at_site BOOLEAN DEFAULT false,
		num_labours TEXT,
		construction_material_at_site BOOLEAN DEFAULT false,
		created_by_user_id TEXT
	);`

	photosTable := `
	CREATE TABLE IF NOT EXISTS photos (
		id TEXT PRIMARY KEY,
		inspection_id TEXT REFERENCES inspections(id) ON DELETE CASCADE,
		file_path TEXT,
		file_name TEXT,
		photo_type TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := DB.Exec(usersTable); err != nil {
		return fmt.Errorf("creating users table: %w", err)
	}
	if _, err := DB.Exec(inspectionsTable); err != nil {
		return fmt.Errorf("creating inspections table: %w", err)
	}
	if _, err := DB.Exec(photosTable); err != nil {
		return fmt.Errorf("creating photos table: %w", err)
	}

	return nil
}

func seedInitialAdminPostgres() error {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM users WHERE email = $1", InitialAdminEmail).Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		return nil
	}

	id := uuid.New().String()
	now := time.Now()
	_, err = DB.Exec(`
		INSERT INTO users (id, email, name, role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		id, InitialAdminEmail, "Admin", models.RoleAdmin, true, now, now)
	if err != nil {
		return err
	}

	log.Printf("Created initial admin user: %s", InitialAdminEmail)
	return nil
}

