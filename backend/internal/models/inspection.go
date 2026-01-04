package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// StringSlice is a custom type for handling string slices in SQLite
type StringSlice []string

func (s StringSlice) Value() (driver.Value, error) {
	if len(s) == 0 {
		return "[]", nil
	}
	data, err := json.Marshal(s)
	return string(data), err
}

func (s *StringSlice) Scan(value interface{}) error {
	if value == nil {
		*s = []string{}
		return nil
	}
	var data []byte
	switch v := value.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	}
	return json.Unmarshal(data, s)
}

// Inspection represents a property inspection record
type Inspection struct {
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Status    string    `json:"status"` // draft, submitted, completed

	// Initial Info
	EmployeeName   string `json:"employee_name"`
	Location       string `json:"location"`
	InspectionDate string `json:"inspection_date"`
	PersonVisited  string `json:"person_visited"`

	// Basic Info
	TypeOfCase             string `json:"type_of_case"`
	BankName               string `json:"bank_name"`
	ApplicantName          string `json:"applicant_name"`
	ProjectName            string `json:"project_name"`
	PropertyAddress        string `json:"property_address"`
	Landmark               string `json:"landmark"`
	PersonMetAtSite        string `json:"person_met_at_site"`
	RelationWithApplicant  string `json:"relation_with_applicant"`

	// Boundaries
	BoundaryEast  string `json:"boundary_east"`
	BoundaryWest  string `json:"boundary_west"`
	BoundaryNorth string `json:"boundary_north"`
	BoundarySouth string `json:"boundary_south"`
	ApproachRoad  string `json:"approach_road"`
	RoadWidth     string `json:"road_width"`
	RoadWidthUnit string `json:"road_width_unit"`

	// Building Details
	NumFloors        string      `json:"num_floors"`
	TotalBuildings   string      `json:"total_buildings"`
	NumWings         string      `json:"num_wings"`
	TotalFlats       string      `json:"total_flats"`
	PerFloorFlats    string      `json:"per_floor_flats"`
	FlatType         StringSlice `json:"flat_type"`
	CarpetArea       string      `json:"carpet_area"`
	SuperBuiltUpArea string      `json:"super_built_up_area"`

	// Occupancy
	OccupancyStatus          string `json:"occupancy_status"`
	OccupantName             string `json:"occupant_name"`
	OccupiedSince            string `json:"occupied_since"`
	BuildingOccupancyPercent string `json:"building_occupancy_percent"`

	// Building Info
	AgeOfBuilding                string `json:"age_of_building"`
	SurroundingDevelopmentPercent string `json:"surrounding_development_percent"`
	NumLifts                     string `json:"num_lifts"`

	// Financial
	ApproxRent string `json:"approx_rent"`
	MarketRate string `json:"market_rate"`

	// Distances
	DistanceRailway  string `json:"distance_railway"`
	DistanceBus      string `json:"distance_bus"`
	DistanceHospital string `json:"distance_hospital"`

	// Amenities
	FlooringType     string `json:"flooring_type"`
	KitchenPlatform  string `json:"kitchen_platform"`
	WallTilesKitchen string `json:"wall_tiles_kitchen"`
	WallTilesToilet  string `json:"wall_tiles_toilet"`
	WindowsType      string `json:"windows_type"`
	MSGrill          string `json:"ms_grill"`

	// Construction Status
	RCCWork                   string `json:"rcc_work"`
	BrickWork                 string `json:"brick_work"`
	InternalPlaster           string `json:"internal_plaster"`
	ExternalPlaster           string `json:"external_plaster"`
	FlooringWork              string `json:"flooring_work"`
	WindowDoorFitting         string `json:"window_door_fitting"`
	PaintingFinishing         string `json:"painting_finishing"`
	LaboursAtSite             bool   `json:"labours_at_site"`
	NumLabours                string `json:"num_labours"`
	ConstructionMaterialAtSite bool   `json:"construction_material_at_site"`

	// User tracking
	CreatedByUserID string `json:"created_by_user_id"`

	// Photos (populated from separate table)
	Photos []Photo `json:"photos"`
}

// Photo represents an uploaded photo
type Photo struct {
	ID           string    `json:"id"`
	InspectionID string    `json:"inspection_id"`
	FilePath     string    `json:"file_path"`
	FileName     string    `json:"file_name"`
	PhotoType    string    `json:"photo_type"`
	CreatedAt    time.Time `json:"created_at"`
}

// CreateInspectionRequest represents the initial creation request
type CreateInspectionRequest struct {
	EmployeeName    string `json:"employee_name" binding:"required"`
	Location        string `json:"location" binding:"required"`
	InspectionDate  string `json:"inspection_date" binding:"required"`
	PersonVisited   string `json:"person_visited"`
	PropertyAddress string `json:"property_address"`
}

// UpdateInspectionRequest represents an update request
type UpdateInspectionRequest struct {
	Status string `json:"status,omitempty"`

	// Initial info fields (editable)
	EmployeeName   *string `json:"employee_name,omitempty"`
	Location       *string `json:"location,omitempty"`
	InspectionDate *string `json:"inspection_date,omitempty"`
	PersonVisited  *string `json:"person_visited,omitempty"`

	// All other fields are optional for updates
	TypeOfCase             *string      `json:"type_of_case,omitempty"`
	BankName               *string      `json:"bank_name,omitempty"`
	ApplicantName          *string      `json:"applicant_name,omitempty"`
	ProjectName            *string      `json:"project_name,omitempty"`
	PropertyAddress        *string      `json:"property_address,omitempty"`
	Landmark               *string      `json:"landmark,omitempty"`
	PersonMetAtSite        *string      `json:"person_met_at_site,omitempty"`
	RelationWithApplicant  *string      `json:"relation_with_applicant,omitempty"`
	BoundaryEast           *string      `json:"boundary_east,omitempty"`
	BoundaryWest           *string      `json:"boundary_west,omitempty"`
	BoundaryNorth          *string      `json:"boundary_north,omitempty"`
	BoundarySouth          *string      `json:"boundary_south,omitempty"`
	ApproachRoad           *string      `json:"approach_road,omitempty"`
	RoadWidth              *string      `json:"road_width,omitempty"`
	RoadWidthUnit          *string      `json:"road_width_unit,omitempty"`
	NumFloors              *string      `json:"num_floors,omitempty"`
	TotalBuildings         *string      `json:"total_buildings,omitempty"`
	NumWings               *string      `json:"num_wings,omitempty"`
	TotalFlats             *string      `json:"total_flats,omitempty"`
	PerFloorFlats          *string      `json:"per_floor_flats,omitempty"`
	FlatType               *StringSlice `json:"flat_type,omitempty"`
	CarpetArea             *string      `json:"carpet_area,omitempty"`
	SuperBuiltUpArea       *string      `json:"super_built_up_area,omitempty"`
	OccupancyStatus        *string      `json:"occupancy_status,omitempty"`
	OccupantName           *string      `json:"occupant_name,omitempty"`
	OccupiedSince          *string      `json:"occupied_since,omitempty"`
	BuildingOccupancyPercent *string    `json:"building_occupancy_percent,omitempty"`
	AgeOfBuilding          *string      `json:"age_of_building,omitempty"`
	SurroundingDevelopmentPercent *string `json:"surrounding_development_percent,omitempty"`
	NumLifts               *string      `json:"num_lifts,omitempty"`
	ApproxRent             *string      `json:"approx_rent,omitempty"`
	MarketRate             *string      `json:"market_rate,omitempty"`
	DistanceRailway        *string      `json:"distance_railway,omitempty"`
	DistanceBus            *string      `json:"distance_bus,omitempty"`
	DistanceHospital       *string      `json:"distance_hospital,omitempty"`
	FlooringType           *string      `json:"flooring_type,omitempty"`
	KitchenPlatform        *string      `json:"kitchen_platform,omitempty"`
	WallTilesKitchen       *string      `json:"wall_tiles_kitchen,omitempty"`
	WallTilesToilet        *string      `json:"wall_tiles_toilet,omitempty"`
	WindowsType            *string      `json:"windows_type,omitempty"`
	MSGrill                *string      `json:"ms_grill,omitempty"`
	RCCWork                *string      `json:"rcc_work,omitempty"`
	BrickWork              *string      `json:"brick_work,omitempty"`
	InternalPlaster        *string      `json:"internal_plaster,omitempty"`
	ExternalPlaster        *string      `json:"external_plaster,omitempty"`
	FlooringWork           *string      `json:"flooring_work,omitempty"`
	WindowDoorFitting      *string      `json:"window_door_fitting,omitempty"`
	PaintingFinishing      *string      `json:"painting_finishing,omitempty"`
	LaboursAtSite          *bool        `json:"labours_at_site,omitempty"`
	NumLabours             *string      `json:"num_labours,omitempty"`
	ConstructionMaterialAtSite *bool    `json:"construction_material_at_site,omitempty"`
}

