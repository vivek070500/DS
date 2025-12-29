package database

import (
	"database/sql"
	"log"
	"time"

	"ds-enterprises/internal/models"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

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

	log.Println("Database initialized successfully")
	return nil
}

func createTables() error {
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
		construction_material_at_site INTEGER DEFAULT 0
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

	if _, err := DB.Exec(inspectionsTable); err != nil {
		return err
	}
	if _, err := DB.Exec(photosTable); err != nil {
		return err
	}
	return nil
}

// CreateInspection creates a new inspection record
func CreateInspection(req models.CreateInspectionRequest) (*models.Inspection, error) {
	id := uuid.New().String()
	now := time.Now()

	_, err := DB.Exec(`
		INSERT INTO inspections (id, created_at, updated_at, employee_name, location, inspection_date, person_visited)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		id, now, now, req.EmployeeName, req.Location, req.InspectionDate, req.PersonVisited)
	if err != nil {
		return nil, err
	}

	return GetInspectionByID(id)
}

// GetInspectionByID retrieves an inspection by ID
func GetInspectionByID(id string) (*models.Inspection, error) {
	var i models.Inspection
	var flatType sql.NullString

	err := DB.QueryRow(`
		SELECT id, created_at, updated_at, status,
			employee_name, location, inspection_date, person_visited,
			type_of_case, bank_name, applicant_name, project_name, property_address,
			landmark, person_met_at_site, relation_with_applicant,
			boundary_east, boundary_west, boundary_north, boundary_south,
			num_floors, total_buildings, num_wings, total_flats, per_floor_flats,
			flat_type, carpet_area, super_built_up_area,
			occupancy_status, occupant_name, occupied_since, building_occupancy_percent,
			age_of_building, surrounding_development_percent, num_lifts,
			approx_rent, market_rate,
			distance_railway, distance_bus, distance_hospital,
			flooring_type, kitchen_platform, wall_tiles_kitchen, wall_tiles_toilet,
			windows_type, ms_grill,
			rcc_work, brick_work, internal_plaster, external_plaster, flooring_work,
			window_door_fitting, painting_finishing, labours_at_site, num_labours,
			construction_material_at_site
		FROM inspections WHERE id = ?`, id).Scan(
		&i.ID, &i.CreatedAt, &i.UpdatedAt, &i.Status,
		&i.EmployeeName, &i.Location, &i.InspectionDate, &i.PersonVisited,
		&i.TypeOfCase, &i.BankName, &i.ApplicantName, &i.ProjectName, &i.PropertyAddress,
		&i.Landmark, &i.PersonMetAtSite, &i.RelationWithApplicant,
		&i.BoundaryEast, &i.BoundaryWest, &i.BoundaryNorth, &i.BoundarySouth,
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
		&i.ConstructionMaterialAtSite,
	)
	if err != nil {
		return nil, err
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
		SELECT id, created_at, updated_at, status, employee_name, location, inspection_date, person_visited,
			type_of_case, bank_name, applicant_name
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
			&i.TypeOfCase, &i.BankName, &i.ApplicantName,
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

	_, err := DB.Exec(query, args...)
	if err != nil {
		return nil, err
	}

	return GetInspectionByID(id)
}

// DeleteInspection deletes an inspection by ID
func DeleteInspection(id string) error {
	_, err := DB.Exec("DELETE FROM inspections WHERE id = ?", id)
	return err
}

// CreatePhoto creates a new photo record
func CreatePhoto(photo models.Photo) (*models.Photo, error) {
	id := uuid.New().String()
	now := time.Now()

	_, err := DB.Exec(`
		INSERT INTO photos (id, inspection_id, file_path, file_name, photo_type, created_at)
		VALUES (?, ?, ?, ?, ?, ?)`,
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
	rows, err := DB.Query(`
		SELECT id, inspection_id, file_path, file_name, photo_type, created_at
		FROM photos WHERE inspection_id = ?`, inspectionID)
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
	_, err := DB.Exec("DELETE FROM photos WHERE id = ?", id)
	return err
}

