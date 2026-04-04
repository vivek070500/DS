// User types
export type UserRole = "admin" | "user";

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface MeasurementRow {
  description: string;
  length: number;
  width: number;
}

export interface Inspection {
  id: string;
  created_at: string;
  updated_at: string;
  status: "draft" | "submitted" | "completed";

  // Initial Info
  employee_name: string;
  location: string;
  inspection_date: string;
  person_visited: string;

  // Initial Info (continued)
  road_size: string;
  rera_registered: boolean;
  rera_number: string;

  // Basic Info
  type_of_case: string;
  bank_name: string;
  applicant_name: string;
  project_name: string;
  property_address: string;
  landmark: string;
  person_met_at_site: string;
  relation_with_applicant: string;

  // Boundaries
  boundary_east: string;
  boundary_west: string;
  boundary_north: string;
  boundary_south: string;
  approach_road: string;
  road_width: string;
  road_width_unit: string;

  // Building Details
  num_floors: string;
  total_buildings: string;
  num_wings: string;
  total_flats: string;
  per_floor_flats: string;
  flat_type: string[];
  carpet_area: string;
  super_built_up_area: string;
  measurements: MeasurementRow[];

  // Occupancy
  occupancy_status: string;
  occupant_name: string;
  occupied_since: string;
  building_occupancy_percent: string;

  // Building Info
  age_of_building: string;
  surrounding_development_percent: string;
  num_lifts: string;

  // Financial
  approx_rent: string;
  market_rate: string;

  // Distances
  distance_railway: string;
  distance_bus: string;
  distance_hospital: string;

  // Amenities
  flooring_type: string;
  kitchen_platform: string;
  wall_tiles_kitchen: string;
  wall_tiles_toilet: string;
  windows_type: string;
  ms_grill: string;

  // Construction Status (for under construction)
  rcc_work: string;
  brick_work: string;
  internal_plaster: string;
  external_plaster: string;
  flooring_work: string;
  window_door_fitting: string;
  painting_finishing: string;
  labours_at_site: boolean;
  num_labours: string;
  construction_material_at_site: boolean;

  // Remarks
  critical_remarks: string;

  // Photos
  photos: Photo[];
}

export interface Photo {
  id: string;
  inspection_id: string;
  file_path: string;
  file_name: string;
  photo_type: string;
  created_at: string;
}

export interface CreateInspectionRequest {
  employee_name: string;
  location: string;
  inspection_date: string;
  person_visited: string;
  property_address: string;
  applicant_name: string;
  road_size: string;
  rera_registered: boolean;
  rera_number: string;
}

export interface UpdateInspectionRequest extends Partial<Omit<Inspection, "id" | "created_at" | "updated_at" | "photos">> {}

export const CASE_TYPES = [
  "RESALE",
  "LAP",
  "BALANCE TRANSFER (BT)",
  "TOP UP",
  "BUILDER PURCHASE",
] as const;

export const FLAT_TYPES = [
  "1 RK",
  "1 BHK",
  "2 BHK",
  "3 BHK",
  "4 BHK",
  "Row House",
  "Shop",
  "Office",
] as const;

export const OCCUPANCY_STATUSES = [
  "Seller Occupied",
  "Applicant Occupied",
  "Tenant Occupied (Rented)",
  "Vacant",
] as const;

export const LIFT_OPTIONS = ["Not Available", "One", "Two", "Three", "Four", "Five", "Six"] as const;

export const FLOORING_TYPES = [
  "Vitrified",
  "Ceramic",
  "Mosaic",
  "Kota",
  "Marble",
  "Italian Marble",
] as const;

export const KITCHEN_PLATFORM_TYPES = ["Granite", "Marble", "Kadappa"] as const;

export const WINDOW_TYPES = [
  "Aluminium Sliding",
  "Powder Coated Aluminium Sliding",
  "Anodized Sliding",
  "Wooden",
] as const;

