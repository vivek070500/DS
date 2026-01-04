"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import { inspectionApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Inspection, UpdateInspectionRequest } from "@/lib/types";
import {
  CASE_TYPES,
  FLAT_TYPES,
  OCCUPANCY_STATUSES,
  LIFT_OPTIONS,
  FLOORING_TYPES,
  KITCHEN_PLATFORM_TYPES,
  WINDOW_TYPES,
} from "@/lib/types";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  Building,
  FileText,
  Home,
  Compass,
  Ruler,
  DollarSign,
  MapPin,
  Wrench,
  HardHat,
  User,
  Calendar,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "initial" | "basic" | "property" | "boundaries" | "occupancy" | "financial" | "amenities" | "construction";

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { key: "initial", label: "Initial Info", icon: <User className="w-4 h-4" /> },
  { key: "basic", label: "Basic Info", icon: <FileText className="w-4 h-4" /> },
  { key: "property", label: "Property", icon: <Building className="w-4 h-4" /> },
  { key: "boundaries", label: "Boundaries", icon: <Compass className="w-4 h-4" /> },
  { key: "occupancy", label: "Occupancy", icon: <Home className="w-4 h-4" /> },
  { key: "financial", label: "Financial", icon: <DollarSign className="w-4 h-4" /> },
  { key: "amenities", label: "Amenities", icon: <Ruler className="w-4 h-4" /> },
  { key: "construction", label: "Construction", icon: <HardHat className="w-4 h-4" /> },
];

export default function FormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>("initial");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [formData, setFormData] = useState<UpdateInspectionRequest>({});

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadInspection();
    }
  }, [id, isAuthenticated]);

  const loadInspection = async () => {
    try {
      const data = await inspectionApi.getById(id);
      setInspection(data);
      setFormData(data);
    } catch (error) {
      console.error("Error loading inspection:", error);
      alert("Failed to load inspection");
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFlatTypeChange = (flatType: string, checked: boolean) => {
    const currentTypes = formData.flat_type || [];
    const newTypes = checked
      ? [...currentTypes, flatType]
      : currentTypes.filter((t) => t !== flatType);
    setFormData((prev) => ({ ...prev, flat_type: newTypes }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await inspectionApi.update(id, formData);
      alert("Saved successfully!");
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await inspectionApi.update(id, { ...formData, status: "submitted" });
      router.push(`/preview/${id}`);
    } catch (error) {
      console.error("Error submitting:", error);
      alert("Failed to submit");
    } finally {
      setIsSaving(false);
    }
  };

  const goToNextTab = () => {
    const currentIndex = TABS.findIndex((t) => t.key === activeTab);
    if (currentIndex < TABS.length - 1) {
      setActiveTab(TABS[currentIndex + 1].key);
    }
  };

  const goToPrevTab = () => {
    const currentIndex = TABS.findIndex((t) => t.key === activeTab);
    if (currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1].key);
    }
  };

  if (authLoading || isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Progress Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading text-2xl font-bold text-gray-900">
                Property Inspection Form
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Location: {inspection?.location}
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-secondary flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Draft
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200",
                  activeTab === tab.key
                    ? "bg-primary-600 text-white shadow-lg shadow-primary-600/25"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="card p-6 sm:p-8 animate-fade-in animation-delay-100">
          {/* Initial Info Tab */}
          {activeTab === "initial" && (
            <div className="space-y-6">
              <h3 className="section-title">
                <User className="w-5 h-5 text-primary-600" />
                Initial Information
              </h3>
              <p className="text-sm text-gray-500 -mt-2">
                Edit the details you entered on the home page
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">
                    <User className="w-4 h-4 inline mr-2 text-primary-600" />
                    Employee Name
                  </label>
                  <input
                    type="text"
                    name="employee_name"
                    value={formData.employee_name || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter employee name"
                  />
                </div>
                <div>
                  <label className="form-label">
                    <UserCheck className="w-4 h-4 inline mr-2 text-primary-600" />
                    Person Visited
                  </label>
                  <input
                    type="text"
                    name="person_visited"
                    value={formData.person_visited || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Name of person visited"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">
                  <MapPin className="w-4 h-4 inline mr-2 text-primary-600" />
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location || ""}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter property location"
                />
              </div>

              <div>
                <label className="form-label">
                  <Calendar className="w-4 h-4 inline mr-2 text-primary-600" />
                  Inspection Date
                </label>
                <input
                  type="date"
                  name="inspection_date"
                  value={formData.inspection_date || ""}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>
            </div>
          )}

          {/* Basic Info Tab */}
          {activeTab === "basic" && (
            <div className="space-y-6">
              <h3 className="section-title">
                <FileText className="w-5 h-5 text-primary-600" />
                Basic Information
              </h3>

              <div>
                <label className="form-label">Type of Case</label>
                <div className="flex flex-wrap gap-3">
                  {CASE_TYPES.map((type) => (
                    <label
                      key={type}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all duration-200",
                        formData.type_of_case === type
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-gray-200 hover:border-primary-300"
                      )}
                    >
                      <input
                        type="radio"
                        name="type_of_case"
                        value={type}
                        checked={formData.type_of_case === type}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Bank Name</label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter bank name"
                  />
                </div>
                <div>
                  <label className="form-label">Name of Applicant/s</label>
                  <input
                    type="text"
                    name="applicant_name"
                    value={formData.applicant_name || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter applicant name"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Name of Project</label>
                <input
                  type="text"
                  name="project_name"
                  value={formData.project_name || ""}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="form-label">Property Address with Access Road</label>
                <textarea
                  name="property_address"
                  value={formData.property_address || ""}
                  onChange={handleInputChange}
                  className="input-field min-h-[100px]"
                  placeholder="Enter complete property address"
                />
              </div>

              <div>
                <label className="form-label">Landmark</label>
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark || ""}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter nearby landmark"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Name of Person Met at Site</label>
                  <input
                    type="text"
                    name="person_met_at_site"
                    value={formData.person_met_at_site || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <label className="form-label">Relation with Applicant</label>
                  <input
                    type="text"
                    name="relation_with_applicant"
                    value={formData.relation_with_applicant || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., Owner, Broker, Tenant"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Property Details Tab */}
          {activeTab === "property" && (
            <div className="space-y-6">
              <h3 className="section-title">
                <Building className="w-5 h-5 text-primary-600" />
                Property Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="form-label">Number of Floors</label>
                  <input
                    type="text"
                    name="num_floors"
                    value={formData.num_floors || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., G+4"
                  />
                </div>
                <div>
                  <label className="form-label">Total Buildings in Complex</label>
                  <input
                    type="text"
                    name="total_buildings"
                    value={formData.total_buildings || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Number of buildings"
                  />
                </div>
                <div>
                  <label className="form-label">Number of Wings</label>
                  <input
                    type="text"
                    name="num_wings"
                    value={formData.num_wings || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Number of wings"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Total Flats in Building</label>
                  <input
                    type="text"
                    name="total_flats"
                    value={formData.total_flats || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Total number of flats"
                  />
                </div>
                <div>
                  <label className="form-label">Flats Per Floor</label>
                  <input
                    type="text"
                    name="per_floor_flats"
                    value={formData.per_floor_flats || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Flats on each floor"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Type of Flats/Shops/Office</label>
                <div className="flex flex-wrap gap-3">
                  {FLAT_TYPES.map((type) => (
                    <label
                      key={type}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all duration-200",
                        (formData.flat_type || []).includes(type)
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-gray-200 hover:border-primary-300"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={(formData.flat_type || []).includes(type)}
                        onChange={(e) => handleFlatTypeChange(type, e.target.checked)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Carpet Area (sq ft)</label>
                  <input
                    type="text"
                    name="carpet_area"
                    value={formData.carpet_area || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter carpet area"
                  />
                </div>
                <div>
                  <label className="form-label">Super Built Up Area (sq ft)</label>
                  <input
                    type="text"
                    name="super_built_up_area"
                    value={formData.super_built_up_area || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter super built up area"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Number of Lifts</label>
                <div className="flex flex-wrap gap-3">
                  {LIFT_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all duration-200",
                        formData.num_lifts === option
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-gray-200 hover:border-primary-300"
                      )}
                    >
                      <input
                        type="radio"
                        name="num_lifts"
                        value={option}
                        checked={formData.num_lifts === option}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Boundaries Tab */}
          {activeTab === "boundaries" && (
            <div className="space-y-6">
              <h3 className="section-title">
                <Compass className="w-5 h-5 text-primary-600" />
                Boundaries Details of Building
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">On or Towards East</label>
                  <input
                    type="text"
                    name="boundary_east"
                    value={formData.boundary_east || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="What is on the east side?"
                  />
                </div>
                <div>
                  <label className="form-label">On or Towards West</label>
                  <input
                    type="text"
                    name="boundary_west"
                    value={formData.boundary_west || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="What is on the west side?"
                  />
                </div>
                <div>
                  <label className="form-label">On or Towards North</label>
                  <input
                    type="text"
                    name="boundary_north"
                    value={formData.boundary_north || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="What is on the north side?"
                  />
                </div>
                <div>
                  <label className="form-label">On or Towards South</label>
                  <input
                    type="text"
                    name="boundary_south"
                    value={formData.boundary_south || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="What is on the south side?"
                  />
                </div>
              </div>

              {/* Approach Road */}
              <div>
                <label className="form-label">Approach Road</label>
                <div className="flex gap-4">
                  {["Yes", "No"].map((option) => (
                    <label
                      key={option}
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-lg border cursor-pointer transition-all duration-200",
                        formData.approach_road === option
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-gray-200 hover:border-primary-300"
                      )}
                    >
                      <input
                        type="radio"
                        name="approach_road"
                        value={option}
                        checked={formData.approach_road === option}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <span className="font-medium">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Width of Road */}
              <div>
                <label className="form-label">Width of Road</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    name="road_width"
                    value={formData.road_width || ""}
                    onChange={handleInputChange}
                    className="input-field flex-1"
                    placeholder="Enter road width"
                  />
                  <div className="flex gap-2">
                    {["Meters", "Feet"].map((unit) => (
                      <label
                        key={unit}
                        className={cn(
                          "flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-all duration-200",
                          formData.road_width_unit === unit
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-gray-200 hover:border-primary-300"
                        )}
                      >
                        <input
                          type="radio"
                          name="road_width_unit"
                          value={unit}
                          checked={formData.road_width_unit === unit}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium">{unit}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Occupancy Tab */}
          {activeTab === "occupancy" && (
            <div className="space-y-6">
              <h3 className="section-title">
                <Home className="w-5 h-5 text-primary-600" />
                Occupancy Details
              </h3>

              <div>
                <label className="form-label">Flat Occupancy Status</label>
                <div className="flex flex-wrap gap-3">
                  {OCCUPANCY_STATUSES.map((status) => (
                    <label
                      key={status}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all duration-200",
                        formData.occupancy_status === status
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-gray-200 hover:border-primary-300"
                      )}
                    >
                      <input
                        type="radio"
                        name="occupancy_status"
                        value={status}
                        checked={formData.occupancy_status === status}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Name of Property Occupant</label>
                  <input
                    type="text"
                    name="occupant_name"
                    value={formData.occupant_name || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter occupant name"
                  />
                </div>
                <div>
                  <label className="form-label">Occupied/Vacant Since (years)</label>
                  <input
                    type="text"
                    name="occupied_since"
                    value={formData.occupied_since || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Number of years"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Building Occupancy (%)</label>
                  <input
                    type="text"
                    name="building_occupancy_percent"
                    value={formData.building_occupancy_percent || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., 80%"
                  />
                </div>
                <div>
                  <label className="form-label">Age of Building</label>
                  <input
                    type="text"
                    name="age_of_building"
                    value={formData.age_of_building || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., 5 years"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Surrounding Locality Development (%)</label>
                <input
                  type="text"
                  name="surrounding_development_percent"
                  value={formData.surrounding_development_percent || ""}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="e.g., 75%"
                />
              </div>
            </div>
          )}

          {/* Financial Tab */}
          {activeTab === "financial" && (
            <div className="space-y-6">
              <h3 className="section-title">
                <DollarSign className="w-5 h-5 text-primary-600" />
                Financial & Distance Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Approx Rent (₹/month)</label>
                  <input
                    type="text"
                    name="approx_rent"
                    value={formData.approx_rent || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., 15000"
                  />
                </div>
                <div>
                  <label className="form-label">Market Rate (₹/sq ft)</label>
                  <input
                    type="text"
                    name="market_rate"
                    value={formData.market_rate || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="As per estate agent"
                  />
                </div>
              </div>

              <h4 className="font-semibold text-gray-700 flex items-center gap-2 mt-8 mb-4">
                <MapPin className="w-4 h-4 text-primary-600" />
                Distance From
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="form-label">Nearest Railway Station</label>
                  <input
                    type="text"
                    name="distance_railway"
                    value={formData.distance_railway || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., 2 km"
                  />
                </div>
                <div>
                  <label className="form-label">Bus Stop</label>
                  <input
                    type="text"
                    name="distance_bus"
                    value={formData.distance_bus || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., 500 m"
                  />
                </div>
                <div>
                  <label className="form-label">Hospital/School</label>
                  <input
                    type="text"
                    name="distance_hospital"
                    value={formData.distance_hospital || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., 1 km"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Amenities Tab */}
          {activeTab === "amenities" && (
            <div className="space-y-6">
              <h3 className="section-title">
                <Ruler className="w-5 h-5 text-primary-600" />
                Amenities Provided/Proposed
              </h3>

              <div>
                <label className="form-label">Flooring Type</label>
                <div className="flex flex-wrap gap-3">
                  {FLOORING_TYPES.map((type) => (
                    <label
                      key={type}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all duration-200",
                        formData.flooring_type === type
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-gray-200 hover:border-primary-300"
                      )}
                    >
                      <input
                        type="radio"
                        name="flooring_type"
                        value={type}
                        checked={formData.flooring_type === type}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Kitchen Platform</label>
                <div className="flex flex-wrap gap-3">
                  {KITCHEN_PLATFORM_TYPES.map((type) => (
                    <label
                      key={type}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all duration-200",
                        formData.kitchen_platform === type
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-gray-200 hover:border-primary-300"
                      )}
                    >
                      <input
                        type="radio"
                        name="kitchen_platform"
                        value={type}
                        checked={formData.kitchen_platform === type}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Wall Tiles - Kitchen</label>
                  <input
                    type="text"
                    name="wall_tiles_kitchen"
                    value={formData.wall_tiles_kitchen || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., Full height ceramic"
                  />
                </div>
                <div>
                  <label className="form-label">Wall Tiles - Toilet/Bath</label>
                  <input
                    type="text"
                    name="wall_tiles_toilet"
                    value={formData.wall_tiles_toilet || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., Full height ceramic"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Windows Type</label>
                <div className="flex flex-wrap gap-3">
                  {WINDOW_TYPES.map((type) => (
                    <label
                      key={type}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all duration-200",
                        formData.windows_type === type
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-gray-200 hover:border-primary-300"
                      )}
                    >
                      <input
                        type="radio"
                        name="windows_type"
                        value={type}
                        checked={formData.windows_type === type}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">M.S. Grill</label>
                <input
                  type="text"
                  name="ms_grill"
                  value={formData.ms_grill || ""}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="e.g., Yes, in all windows"
                />
              </div>
            </div>
          )}

          {/* Construction Tab */}
          {activeTab === "construction" && (
            <div className="space-y-6">
              <h3 className="section-title">
                <HardHat className="w-5 h-5 text-primary-600" />
                For Under Construction Properties
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">RCC Work</label>
                  <input
                    type="text"
                    name="rcc_work"
                    value={formData.rcc_work || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., Completed"
                  />
                </div>
                <div>
                  <label className="form-label">Brick Work</label>
                  <input
                    type="text"
                    name="brick_work"
                    value={formData.brick_work || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., 80% Complete"
                  />
                </div>
                <div>
                  <label className="form-label">Internal Plaster</label>
                  <input
                    type="text"
                    name="internal_plaster"
                    value={formData.internal_plaster || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., In Progress"
                  />
                </div>
                <div>
                  <label className="form-label">External Plaster</label>
                  <input
                    type="text"
                    name="external_plaster"
                    value={formData.external_plaster || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., Not Started"
                  />
                </div>
                <div>
                  <label className="form-label">Flooring</label>
                  <input
                    type="text"
                    name="flooring_work"
                    value={formData.flooring_work || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., 50% Complete"
                  />
                </div>
                <div>
                  <label className="form-label">Window/Door Fitting</label>
                  <input
                    type="text"
                    name="window_door_fitting"
                    value={formData.window_door_fitting || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., In Progress"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Painting and Finishing Works</label>
                <input
                  type="text"
                  name="painting_finishing"
                  value={formData.painting_finishing || ""}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="e.g., Not Started"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="form-label flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="labours_at_site"
                      checked={formData.labours_at_site || false}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Labours at Site
                  </label>
                  {formData.labours_at_site && (
                    <input
                      type="text"
                      name="num_labours"
                      value={formData.num_labours || ""}
                      onChange={handleInputChange}
                      className="input-field mt-2"
                      placeholder="Number of labours"
                    />
                  )}
                </div>
                <div>
                  <label className="form-label flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="construction_material_at_site"
                      checked={formData.construction_material_at_site || false}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Construction Material at Site
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 py-4 px-4">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex gap-3">
              {activeTab === "initial" ? (
                <button
                  onClick={() => router.push("/")}
                  className="btn-secondary flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </button>
              ) : (
                <button
                  onClick={goToPrevTab}
                  className="btn-secondary flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </button>
              )}
            </div>

            <div className="flex gap-3">
              {activeTab === "construction" ? (
                <button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="btn-primary flex items-center gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Submit & Preview
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={goToNextTab}
                  className="btn-primary flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

