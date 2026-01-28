package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"ds-enterprises/internal/models"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB
var isPostgres bool

// Initial admin email
const InitialAdminEmail = "vivektarachandani0705@gmail.com"

// convertPlaceholders converts ? placeholders to $1, $2, etc. for PostgreSQL
func convertPlaceholders(query string) string {
	if !isPostgres {
		return query
	}
	result := ""
	paramNum := 1
	for _, char := range query {
		if char == '?' {
			result += fmt.Sprintf("$%d", paramNum)
			paramNum++
		} else {
			result += string(char)
		}
	}
	return result
}

func InitDB(dbPath string) error {
	var err error
	DB, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		return err
	}

	// Create tables
	if err := createTables(); err != nil {
		return err
	}

	// Seed initial admin
	if err := seedInitialAdmin(); err != nil {
		log.Printf("Warning: Could not seed initial admin: %v", err)
	}

	log.Println("Database initialized successfully")
	return nil
}

func createTables() error {
	usersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		email TEXT UNIQUE NOT NULL,
		name TEXT NOT NULL,
		picture TEXT,
		role TEXT NOT NULL DEFAULT 'user',
		is_active INTEGER NOT NULL DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		created_by TEXT
	);`

	inspectionsTable := `
	CREATE TABLE IF NOT EXISTS inspections (
		id TEXT PRIMARY KEY,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
		labours_at_site INTEGER DEFAULT 0,
		num_labours TEXT,
		construction_material_at_site INTEGER DEFAULT 0,
		created_by_user_id TEXT
	);`

	photosTable := `
	CREATE TABLE IF NOT EXISTS photos (
		id TEXT PRIMARY KEY,
		inspection_id TEXT,
		file_path TEXT,
		file_name TEXT,
		photo_type TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
	);`

	if _, err := DB.Exec(usersTable); err != nil {
		return err
	}
	if _, err := DB.Exec(inspectionsTable); err != nil {
		return err
	}
	if _, err := DB.Exec(photosTable); err != nil {
		return err
	}

	// Add new columns for existing databases (will silently fail if columns already exist)
	migrations := []string{
		"ALTER TABLE inspections ADD COLUMN approach_road TEXT",
		"ALTER TABLE inspections ADD COLUMN road_width TEXT",
		"ALTER TABLE inspections ADD COLUMN road_width_unit TEXT",
		"ALTER TABLE inspections ADD COLUMN created_by_user_id TEXT",
	}
	for _, m := range migrations {
		DB.Exec(m) // Ignore errors (column may already exist)
	}

	return nil
}

func seedInitialAdmin() error {
	// Check if admin already exists
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM users WHERE email = ?", InitialAdminEmail).Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		return nil // Admin already exists
	}

	// Create initial admin
	id := uuid.New().String()
	now := time.Now()
	_, err = DB.Exec(`
		INSERT INTO users (id, email, name, role, is_active, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		id, InitialAdminEmail, "Admin", models.RoleAdmin, true, now, now)
	if err != nil {
		return err
	}

	log.Printf("Created initial admin user: %s", InitialAdminEmail)
	return nil
}

// CreateInspection creates a new inspection record
func CreateInspection(req models.CreateInspectionRequest, userID string) (*models.Inspection, error) {
	id := uuid.New().String()
	now := time.Now()

	query := convertPlaceholders(`
		INSERT INTO inspections (id, created_at, updated_at, employee_name, location, inspection_date, person_visited, property_address, applicant_name, created_by_user_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
	_, err := DB.Exec(query,
		id, now, now, req.EmployeeName, req.Location, req.InspectionDate, req.PersonVisited, req.PropertyAddress, req.ApplicantName, userID)
	if err != nil {
		return nil, err
	}

	return GetInspectionByID(id)
}

// GetInspectionByID retrieves an inspection by ID
func GetInspectionByID(id string) (*models.Inspection, error) {
	var i models.Inspection
	var flatType sql.NullString
	var createdByUserID sql.NullString

	query := convertPlaceholders(`
		SELECT id, created_at, updated_at, COALESCE(status, 'draft'),
			COALESCE(employee_name, ''), COALESCE(location, ''), COALESCE(inspection_date, ''), COALESCE(person_visited, ''),
			COALESCE(type_of_case, ''), COALESCE(bank_name, ''), COALESCE(applicant_name, ''), COALESCE(project_name, ''), COALESCE(property_address, ''),
			COALESCE(landmark, ''), COALESCE(person_met_at_site, ''), COALESCE(relation_with_applicant, ''),
			COALESCE(boundary_east, ''), COALESCE(boundary_west, ''), COALESCE(boundary_north, ''), COALESCE(boundary_south, ''),
			COALESCE(approach_road, ''), COALESCE(road_width, ''), COALESCE(road_width_unit, ''),
			COALESCE(num_floors, ''), COALESCE(total_buildings, ''), COALESCE(num_wings, ''), COALESCE(total_flats, ''), COALESCE(per_floor_flats, ''),
			flat_type, COALESCE(carpet_area, ''), COALESCE(super_built_up_area, ''),
			COALESCE(occupancy_status, ''), COALESCE(occupant_name, ''), COALESCE(occupied_since, ''), COALESCE(building_occupancy_percent, ''),
			COALESCE(age_of_building, ''), COALESCE(surrounding_development_percent, ''), COALESCE(num_lifts, ''),
			COALESCE(approx_rent, ''), COALESCE(market_rate, ''),
			COALESCE(distance_railway, ''), COALESCE(distance_bus, ''), COALESCE(distance_hospital, ''),
			COALESCE(flooring_type, ''), COALESCE(kitchen_platform, ''), COALESCE(wall_tiles_kitchen, ''), COALESCE(wall_tiles_toilet, ''),
			COALESCE(windows_type, ''), COALESCE(ms_grill, ''),
			COALESCE(rcc_work, ''), COALESCE(brick_work, ''), COALESCE(internal_plaster, ''), COALESCE(external_plaster, ''), COALESCE(flooring_work, ''),
			COALESCE(window_door_fitting, ''), COALESCE(painting_finishing, ''), labours_at_site, COALESCE(num_labours, ''),
			construction_material_at_site, created_by_user_id
		FROM inspections WHERE id = ?`)
	err := DB.QueryRow(query, id).Scan(
		&i.ID, &i.CreatedAt, &i.UpdatedAt, &i.Status,
		&i.EmployeeName, &i.Location, &i.InspectionDate, &i.PersonVisited,
		&i.TypeOfCase, &i.BankName, &i.ApplicantName, &i.ProjectName, &i.PropertyAddress,
		&i.Landmark, &i.PersonMetAtSite, &i.RelationWithApplicant,
		&i.BoundaryEast, &i.BoundaryWest, &i.BoundaryNorth, &i.BoundarySouth,
		&i.ApproachRoad, &i.RoadWidth, &i.RoadWidthUnit,
		&i.NumFloors, &i.TotalBuildings, &i.NumWings, &i.TotalFlats, &i.PerFloorFlats,
		&flatType, &i.CarpetArea, &i.SuperBuiltUpArea,
		&i.OccupancyStatus, &i.OccupantName, &i.OccupiedSince, &i.BuildingOccupancyPercent,
		&i.AgeOfBuilding, &i.SurroundingDevelopmentPercent, &i.NumLifts,
		&i.ApproxRent, &i.MarketRate,
		&i.DistanceRailway, &i.DistanceBus, &i.DistanceHospital,
		&i.FlooringType, &i.KitchenPlatform, &i.WallTilesKitchen, &i.WallTilesToilet,
		&i.WindowsType, &i.MSGrill,
		&i.RCCWork, &i.BrickWork, &i.InternalPlaster, &i.ExternalPlaster, &i.FlooringWork,
		&i.WindowDoorFitting, &i.PaintingFinishing, &i.LaboursAtSite, &i.NumLabours,
		&i.ConstructionMaterialAtSite, &createdByUserID,
	)
	if err != nil {
		return nil, err
	}

	if createdByUserID.Valid {
		i.CreatedByUserID = createdByUserID.String
	}

	if flatType.Valid {
		i.FlatType.Scan(flatType.String)
	}

	// Get photos
	photos, err := GetPhotosByInspectionID(id)
	if err != nil {
		return nil, err
	}
	i.Photos = photos

	return &i, nil
}

// GetAllInspections retrieves all inspections
func GetAllInspections() ([]models.Inspection, error) {
	rows, err := DB.Query(`
		SELECT id, created_at, updated_at, COALESCE(status, 'draft'), 
			COALESCE(employee_name, ''), COALESCE(location, ''), COALESCE(inspection_date, ''), COALESCE(person_visited, ''),
			COALESCE(type_of_case, ''), COALESCE(bank_name, ''), COALESCE(applicant_name, ''), COALESCE(project_name, '')
		FROM inspections ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var inspections []models.Inspection
	for rows.Next() {
		var i models.Inspection
		if err := rows.Scan(
			&i.ID, &i.CreatedAt, &i.UpdatedAt, &i.Status,
			&i.EmployeeName, &i.Location, &i.InspectionDate, &i.PersonVisited,
			&i.TypeOfCase, &i.BankName, &i.ApplicantName, &i.ProjectName,
		); err != nil {
			return nil, err
		}
		inspections = append(inspections, i)
	}

	return inspections, nil
}

// UpdateInspection updates an inspection record
func UpdateInspection(id string, req models.UpdateInspectionRequest) (*models.Inspection, error) {
	// Build the update query dynamically
	query := "UPDATE inspections SET updated_at = ?"
	args := []interface{}{time.Now()}

	if req.Status != "" {
		query += ", status = ?"
		args = append(args, req.Status)
	}
	if req.EmployeeName != nil {
		query += ", employee_name = ?"
		args = append(args, *req.EmployeeName)
	}
	if req.Location != nil {
		query += ", location = ?"
		args = append(args, *req.Location)
	}
	if req.InspectionDate != nil {
		query += ", inspection_date = ?"
		args = append(args, *req.InspectionDate)
	}
	if req.PersonVisited != nil {
		query += ", person_visited = ?"
		args = append(args, *req.PersonVisited)
	}
	if req.TypeOfCase != nil {
		query += ", type_of_case = ?"
		args = append(args, *req.TypeOfCase)
	}
	if req.BankName != nil {
		query += ", bank_name = ?"
		args = append(args, *req.BankName)
	}
	if req.ApplicantName != nil {
		query += ", applicant_name = ?"
		args = append(args, *req.ApplicantName)
	}
	if req.ProjectName != nil {
		query += ", project_name = ?"
		args = append(args, *req.ProjectName)
	}
	if req.PropertyAddress != nil {
		query += ", property_address = ?"
		args = append(args, *req.PropertyAddress)
	}
	if req.Landmark != nil {
		query += ", landmark = ?"
		args = append(args, *req.Landmark)
	}
	if req.PersonMetAtSite != nil {
		query += ", person_met_at_site = ?"
		args = append(args, *req.PersonMetAtSite)
	}
	if req.RelationWithApplicant != nil {
		query += ", relation_with_applicant = ?"
		args = append(args, *req.RelationWithApplicant)
	}
	if req.BoundaryEast != nil {
		query += ", boundary_east = ?"
		args = append(args, *req.BoundaryEast)
	}
	if req.BoundaryWest != nil {
		query += ", boundary_west = ?"
		args = append(args, *req.BoundaryWest)
	}
	if req.BoundaryNorth != nil {
		query += ", boundary_north = ?"
		args = append(args, *req.BoundaryNorth)
	}
	if req.BoundarySouth != nil {
		query += ", boundary_south = ?"
		args = append(args, *req.BoundarySouth)
	}
	if req.ApproachRoad != nil {
		query += ", approach_road = ?"
		args = append(args, *req.ApproachRoad)
	}
	if req.RoadWidth != nil {
		query += ", road_width = ?"
		args = append(args, *req.RoadWidth)
	}
	if req.RoadWidthUnit != nil {
		query += ", road_width_unit = ?"
		args = append(args, *req.RoadWidthUnit)
	}
	if req.NumFloors != nil {
		query += ", num_floors = ?"
		args = append(args, *req.NumFloors)
	}
	if req.TotalBuildings != nil {
		query += ", total_buildings = ?"
		args = append(args, *req.TotalBuildings)
	}
	if req.NumWings != nil {
		query += ", num_wings = ?"
		args = append(args, *req.NumWings)
	}
	if req.TotalFlats != nil {
		query += ", total_flats = ?"
		args = append(args, *req.TotalFlats)
	}
	if req.PerFloorFlats != nil {
		query += ", per_floor_flats = ?"
		args = append(args, *req.PerFloorFlats)
	}
	if req.FlatType != nil {
		value, _ := req.FlatType.Value()
		query += ", flat_type = ?"
		args = append(args, value)
	}
	if req.CarpetArea != nil {
		query += ", carpet_area = ?"
		args = append(args, *req.CarpetArea)
	}
	if req.SuperBuiltUpArea != nil {
		query += ", super_built_up_area = ?"
		args = append(args, *req.SuperBuiltUpArea)
	}
	if req.OccupancyStatus != nil {
		query += ", occupancy_status = ?"
		args = append(args, *req.OccupancyStatus)
	}
	if req.OccupantName != nil {
		query += ", occupant_name = ?"
		args = append(args, *req.OccupantName)
	}
	if req.OccupiedSince != nil {
		query += ", occupied_since = ?"
		args = append(args, *req.OccupiedSince)
	}
	if req.BuildingOccupancyPercent != nil {
		query += ", building_occupancy_percent = ?"
		args = append(args, *req.BuildingOccupancyPercent)
	}
	if req.AgeOfBuilding != nil {
		query += ", age_of_building = ?"
		args = append(args, *req.AgeOfBuilding)
	}
	if req.SurroundingDevelopmentPercent != nil {
		query += ", surrounding_development_percent = ?"
		args = append(args, *req.SurroundingDevelopmentPercent)
	}
	if req.NumLifts != nil {
		query += ", num_lifts = ?"
		args = append(args, *req.NumLifts)
	}
	if req.ApproxRent != nil {
		query += ", approx_rent = ?"
		args = append(args, *req.ApproxRent)
	}
	if req.MarketRate != nil {
		query += ", market_rate = ?"
		args = append(args, *req.MarketRate)
	}
	if req.DistanceRailway != nil {
		query += ", distance_railway = ?"
		args = append(args, *req.DistanceRailway)
	}
	if req.DistanceBus != nil {
		query += ", distance_bus = ?"
		args = append(args, *req.DistanceBus)
	}
	if req.DistanceHospital != nil {
		query += ", distance_hospital = ?"
		args = append(args, *req.DistanceHospital)
	}
	if req.FlooringType != nil {
		query += ", flooring_type = ?"
		args = append(args, *req.FlooringType)
	}
	if req.KitchenPlatform != nil {
		query += ", kitchen_platform = ?"
		args = append(args, *req.KitchenPlatform)
	}
	if req.WallTilesKitchen != nil {
		query += ", wall_tiles_kitchen = ?"
		args = append(args, *req.WallTilesKitchen)
	}
	if req.WallTilesToilet != nil {
		query += ", wall_tiles_toilet = ?"
		args = append(args, *req.WallTilesToilet)
	}
	if req.WindowsType != nil {
		query += ", windows_type = ?"
		args = append(args, *req.WindowsType)
	}
	if req.MSGrill != nil {
		query += ", ms_grill = ?"
		args = append(args, *req.MSGrill)
	}
	if req.RCCWork != nil {
		query += ", rcc_work = ?"
		args = append(args, *req.RCCWork)
	}
	if req.BrickWork != nil {
		query += ", brick_work = ?"
		args = append(args, *req.BrickWork)
	}
	if req.InternalPlaster != nil {
		query += ", internal_plaster = ?"
		args = append(args, *req.InternalPlaster)
	}
	if req.ExternalPlaster != nil {
		query += ", external_plaster = ?"
		args = append(args, *req.ExternalPlaster)
	}
	if req.FlooringWork != nil {
		query += ", flooring_work = ?"
		args = append(args, *req.FlooringWork)
	}
	if req.WindowDoorFitting != nil {
		query += ", window_door_fitting = ?"
		args = append(args, *req.WindowDoorFitting)
	}
	if req.PaintingFinishing != nil {
		query += ", painting_finishing = ?"
		args = append(args, *req.PaintingFinishing)
	}
	if req.LaboursAtSite != nil {
		query += ", labours_at_site = ?"
		args = append(args, *req.LaboursAtSite)
	}
	if req.NumLabours != nil {
		query += ", num_labours = ?"
		args = append(args, *req.NumLabours)
	}
	if req.ConstructionMaterialAtSite != nil {
		query += ", construction_material_at_site = ?"
		args = append(args, *req.ConstructionMaterialAtSite)
	}

	query += " WHERE id = ?"
	args = append(args, id)

	_, err := DB.Exec(convertPlaceholders(query), args...)
	if err != nil {
		return nil, err
	}

	return GetInspectionByID(id)
}

// DeleteInspection deletes an inspection by ID
func DeleteInspection(id string) error {
	_, err := DB.Exec(convertPlaceholders("DELETE FROM inspections WHERE id = ?"), id)
	return err
}

// CreatePhoto creates a new photo record
func CreatePhoto(photo models.Photo) (*models.Photo, error) {
	id := uuid.New().String()
	now := time.Now()

	query := convertPlaceholders(`
		INSERT INTO photos (id, inspection_id, file_path, file_name, photo_type, created_at)
		VALUES (?, ?, ?, ?, ?, ?)`)
	_, err := DB.Exec(query,
		id, photo.InspectionID, photo.FilePath, photo.FileName, photo.PhotoType, now)
	if err != nil {
		return nil, err
	}

	photo.ID = id
	photo.CreatedAt = now
	return &photo, nil
}

// GetPhotosByInspectionID retrieves all photos for an inspection
func GetPhotosByInspectionID(inspectionID string) ([]models.Photo, error) {
	query := convertPlaceholders(`
		SELECT id, inspection_id, file_path, file_name, photo_type, created_at
		FROM photos WHERE inspection_id = ?`)
	rows, err := DB.Query(query, inspectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var photos []models.Photo
	for rows.Next() {
		var p models.Photo
		if err := rows.Scan(&p.ID, &p.InspectionID, &p.FilePath, &p.FileName, &p.PhotoType, &p.CreatedAt); err != nil {
			return nil, err
		}
		photos = append(photos, p)
	}

	return photos, nil
}

// DeletePhoto deletes a photo by ID
func DeletePhoto(id string) error {
	_, err := DB.Exec(convertPlaceholders("DELETE FROM photos WHERE id = ?"), id)
	return err
}

// ========== User Functions ==========

// GetUserByEmail retrieves a user by email
func GetUserByEmail(email string) (*models.User, error) {
	var u models.User
	var createdBy sql.NullString
	var picture sql.NullString

	query := convertPlaceholders(`SELECT id, email, name, COALESCE(picture, ''), role, is_active, created_at, updated_at, created_by
		FROM users WHERE email = ?`)

	err := DB.QueryRow(query, email).Scan(
		&u.ID, &u.Email, &u.Name, &picture, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt, &createdBy)
	if err != nil {
		return nil, err
	}

	if picture.Valid {
		u.Picture = picture.String
	}
	if createdBy.Valid {
		u.CreatedBy = createdBy.String
	}

	return &u, nil
}

// GetUserByID retrieves a user by ID
func GetUserByID(id string) (*models.User, error) {
	var u models.User
	var createdBy sql.NullString
	var picture sql.NullString

	query := convertPlaceholders(`SELECT id, email, name, COALESCE(picture, ''), role, is_active, created_at, updated_at, created_by
		FROM users WHERE id = ?`)

	err := DB.QueryRow(query, id).Scan(
		&u.ID, &u.Email, &u.Name, &picture, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt, &createdBy)
	if err != nil {
		return nil, err
	}

	if picture.Valid {
		u.Picture = picture.String
	}
	if createdBy.Valid {
		u.CreatedBy = createdBy.String
	}

	return &u, nil
}

// GetAllUsers retrieves all users
func GetAllUsers() ([]models.User, error) {
	rows, err := DB.Query(`
		SELECT id, email, name, COALESCE(picture, ''), role, is_active, created_at, updated_at, COALESCE(created_by, '')
		FROM users ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Picture, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt, &u.CreatedBy); err != nil {
			return nil, err
		}
		users = append(users, u)
	}

	return users, nil
}

// CreateUser creates a new user
func CreateUser(req models.CreateUserRequest, createdBy string) (*models.User, error) {
	// Check if user already exists
	existing, _ := GetUserByEmail(req.Email)
	if existing != nil {
		return nil, sql.ErrNoRows // User already exists
	}

	id := uuid.New().String()
	now := time.Now()

	query := convertPlaceholders(`
		INSERT INTO users (id, email, name, role, is_active, created_at, updated_at, created_by)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
	_, err := DB.Exec(query,
		id, req.Email, req.Name, req.Role, true, now, now, createdBy)
	if err != nil {
		return nil, err
	}

	return GetUserByID(id)
}

// UpdateUser updates a user
func UpdateUser(id string, req models.UpdateUserRequest) (*models.User, error) {
	query := "UPDATE users SET updated_at = ?"
	args := []interface{}{time.Now()}

	if req.Name != nil {
		query += ", name = ?"
		args = append(args, *req.Name)
	}
	if req.Role != nil {
		query += ", role = ?"
		args = append(args, *req.Role)
	}
	if req.IsActive != nil {
		query += ", is_active = ?"
		args = append(args, *req.IsActive)
	}

	query += " WHERE id = ?"
	args = append(args, id)

	_, err := DB.Exec(convertPlaceholders(query), args...)
	if err != nil {
		return nil, err
	}

	return GetUserByID(id)
}

// UpdateUserPicture updates user's profile picture
func UpdateUserPicture(id, picture string) error {
	query := convertPlaceholders("UPDATE users SET picture = ?, updated_at = ? WHERE id = ?")
	_, err := DB.Exec(query, picture, time.Now(), id)
	return err
}

// DeleteUser deletes a user
func DeleteUser(id string) error {
	_, err := DB.Exec(convertPlaceholders("DELETE FROM users WHERE id = ?"), id)
	return err
}

// CleanupOldInspections deletes inspections and their photos older than the specified number of days
func CleanupOldInspections(daysOld int) (int64, error) {
	// Calculate cutoff date
	cutoffDate := time.Now().AddDate(0, 0, -daysOld)

	// First, get the IDs of inspections to be deleted (for logging)
	query := convertPlaceholders(`SELECT id FROM inspections WHERE created_at < ?`)
	rows, err := DB.Query(query, cutoffDate)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			continue
		}
		ids = append(ids, id)
	}

	if len(ids) == 0 {
		return 0, nil
	}

	// Photos will be deleted automatically due to ON DELETE CASCADE
	// But we need to get photo paths first for GCS cleanup
	photoQuery := convertPlaceholders(`SELECT file_path FROM photos WHERE inspection_id IN (SELECT id FROM inspections WHERE created_at < ?)`)
	photoRows, err := DB.Query(photoQuery, cutoffDate)
	if err != nil {
		return 0, err
	}
	defer photoRows.Close()

	var photoPaths []string
	for photoRows.Next() {
		var path string
		if err := photoRows.Scan(&path); err != nil {
			continue
		}
		photoPaths = append(photoPaths, path)
	}

	// Delete inspections (photos will cascade delete)
	deleteQuery := convertPlaceholders(`DELETE FROM inspections WHERE created_at < ?`)
	result, err := DB.Exec(deleteQuery, cutoffDate)
	if err != nil {
		return 0, err
	}

	rowsAffected, _ := result.RowsAffected()

	// Log deleted inspections
	for _, id := range ids {
		log.Printf("Deleted old inspection: %s", id)
	}

	// Return photo paths for GCS cleanup (caller should handle this)
	// Store in package variable for retrieval
	lastDeletedPhotoPaths = photoPaths

	return rowsAffected, nil
}

// GetLastDeletedPhotoPaths returns the photo paths from the last cleanup operation
var lastDeletedPhotoPaths []string

func GetLastDeletedPhotoPaths() []string {
	return lastDeletedPhotoPaths
}

// GetInspectionsByUserID retrieves all inspections created by a specific user
func GetInspectionsByUserID(userID string) ([]models.Inspection, error) {
	query := convertPlaceholders(`
		SELECT id, created_at, updated_at, COALESCE(status, 'draft'), 
			COALESCE(employee_name, ''), COALESCE(location, ''), COALESCE(inspection_date, ''), COALESCE(person_visited, ''),
			COALESCE(type_of_case, ''), COALESCE(bank_name, ''), COALESCE(applicant_name, ''), COALESCE(project_name, '')
		FROM inspections WHERE created_by_user_id = ? ORDER BY created_at DESC`)
	rows, err := DB.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var inspections []models.Inspection
	for rows.Next() {
		var i models.Inspection
		if err := rows.Scan(
			&i.ID, &i.CreatedAt, &i.UpdatedAt, &i.Status,
			&i.EmployeeName, &i.Location, &i.InspectionDate, &i.PersonVisited,
			&i.TypeOfCase, &i.BankName, &i.ApplicantName, &i.ProjectName,
		); err != nil {
			return nil, err
		}
		inspections = append(inspections, i)
	}

	return inspections, nil
}
