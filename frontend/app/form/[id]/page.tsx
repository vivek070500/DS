"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import { inspectionApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Inspection, UpdateInspectionRequest, MeasurementRow } from "@/lib/types";
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
  Navigation,
  ExternalLink,
  Plus,
  Trash2,
  AlertTriangle,
  Lock,
  MessageSquareWarning,
  CheckCircle2,
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
  const { isAuthenticated, isLoading: authLoading, user, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>("initial");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [formData, setFormData] = useState<UpdateInspectionRequest>({});
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const formDataRef = useRef(formData);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);
  const isSubmittedStatus = inspection?.status === "submitted" || inspection?.status === "completed";
  const isLocked = isSubmittedStatus && !isAdmin;

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Debounced auto-save: 3 seconds after last change
  useEffect(() => {
    if (isLocked || isLoading || !hasLoadedRef.current) return;

    // Save to localStorage immediately as safety net
    try {
      const uid = user?.id || "anon";
      localStorage.setItem(`inspection_draft_${uid}_${id}`, JSON.stringify(formData));
    } catch { /* ignore quota errors */ }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus("saving");
        await inspectionApi.update(id, formDataRef.current);
        setLastSaved(new Date());
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
      } catch {
        setAutoSaveStatus("idle");
      }
    }, 3000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [formData, id, isLocked, isLoading]);

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

      // Check localStorage for unsaved changes newer than server data
      try {
        const uid = user?.id || "anon";
        const cached = localStorage.getItem(`inspection_draft_${uid}_${id}`);
        if (cached) {
          const cachedData = JSON.parse(cached);
          setFormData({ ...data, ...cachedData });
          localStorage.removeItem(`inspection_draft_${uid}_${id}`);
        } else {
          setFormData(data);
        }
      } catch {
        setFormData(data);
      }

      hasLoadedRef.current = true;
    } catch (error) {
      console.error("Error loading inspection:", error);
      alert("Failed to load inspection");
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });
        
        // Try to get address from coordinates using reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          if (data.display_name) {
            setFormData((prev) => ({ ...prev, location: data.display_name }));
          } else {
            setFormData((prev) => ({ ...prev, location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
          }
        } catch {
          setFormData((prev) => ({ ...prev, location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
        }
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        alert("Unable to get your location. Please enter it manually.");
        console.error(error);
      },
      { enableHighAccuracy: true }
    );
  };

  const openInGoogleMaps = () => {
    if (coordinates) {
      window.open(`https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`, "_blank");
    } else if (formData.location) {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(formData.location)}`, "_blank");
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

  const handleMeasurementChange = (index: number, field: keyof MeasurementRow, value: string) => {
    const current = formData.measurements || [];
    const updated = [...current];
    if (field === "description") {
      updated[index] = { ...updated[index], [field]: value };
    } else {
      updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    }
    setFormData((prev) => ({ ...prev, measurements: updated }));
  };

  const addMeasurementRow = () => {
    const current = formData.measurements || [];
    setFormData((prev) => ({
      ...prev,
      measurements: [...current, { description: "", length: 0, width: 0 }],
    }));
  };

  const removeMeasurementRow = (index: number) => {
    const current = formData.measurements || [];
    setFormData((prev) => ({
      ...prev,
      measurements: current.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await inspectionApi.update(id, formData);
      const uid = user?.id || "anon";
      localStorage.removeItem(`inspection_draft_${uid}_${id}`);
      setLastSaved(new Date());
      alert("Saved successfully!");
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitConfirmed = async () => {
    setShowSubmitConfirm(false);
    setIsSaving(true);
    try {
      await inspectionApi.update(id, { ...formData, status: "submitted" });
      const uid = user?.id || "anon";
      localStorage.removeItem(`inspection_draft_${uid}_${id}`);
      localStorage.removeItem(`home_form_draft_${uid}`);
      localStorage.removeItem(`home_form_coords_${uid}`);
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

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-gray-900">Confirm Submission</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Once submitted, this inspection form <strong>cannot be edited again</strong>. Please make sure all details are correct before proceeding.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="btn-secondary px-5"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitConfirmed}
                className="btn-primary px-5 flex items-center gap-2"
              >
                Yes, Submit
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Submitted Banner */}
        {isSubmittedStatus && (
          <div className={`mb-6 rounded-xl p-4 flex items-center gap-3 animate-fade-in ${
            isAdmin ? "bg-blue-50 border border-blue-200" : "bg-amber-50 border border-amber-200"
          }`}>
            <Lock className={`w-5 h-5 flex-shrink-0 ${isAdmin ? "text-blue-600" : "text-amber-600"}`} />
            <div>
              <p className={`font-medium ${isAdmin ? "text-blue-800" : "text-amber-800"}`}>
                This inspection has been submitted
              </p>
              <p className={`text-sm ${isAdmin ? "text-blue-600" : "text-amber-600"}`}>
                {isAdmin
                  ? "You have admin access — you can still edit this form."
                  : "Submitted forms are read-only and cannot be edited."}
              </p>
            </div>
            <button
              onClick={() => router.push(`/preview/${id}`)}
              className="ml-auto btn-secondary text-sm px-4 py-2 whitespace-nowrap"
            >
              View Preview
            </button>
          </div>
        )}

        {/* Progress Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading text-2xl font-bold text-gray-900">
                Property Inspection Form
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-gray-500 text-sm">
                  Location: {inspection?.location}
                </p>
                {autoSaveStatus === "saving" && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                  </span>
                )}
                {autoSaveStatus === "saved" && (
                  <span className="text-xs text-green-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Saved
                  </span>
                )}
                {lastSaved && autoSaveStatus === "idle" && (
                  <span className="text-xs text-gray-400">
                    Last saved {lastSaved.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
            {!isLocked && (
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
            )}
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
        <fieldset disabled={isLocked} className="card p-6 sm:p-8 animate-fade-in animation-delay-100">
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="location"
                    value={formData.location || ""}
                    onChange={handleInputChange}
                    className="input-field flex-1"
                    placeholder="Enter property location"
                  />
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    className="px-4 py-3 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-xl transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                    title="Get current GPS location"
                  >
                    {isGettingLocation ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Navigation className="w-5 h-5" />
                    )}
                    <span className="hidden sm:inline">GPS</span>
                  </button>
                </div>
                
                {/* Google Map Preview - Show for coordinates OR saved location */}
                {(coordinates || formData.location) && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    <iframe
                      src={coordinates 
                        ? `https://maps.google.com/maps?q=${coordinates.lat},${coordinates.lng}&z=16&output=embed`
                        : `https://maps.google.com/maps?q=${encodeURIComponent(formData.location || '')}&z=16&output=embed`
                      }
                      className="w-full h-[180px] sm:h-[200px]"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Location Map"
                    />
                    <div className="bg-gray-50 px-3 py-2 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs text-gray-500 flex-1 truncate">
                        📍 {coordinates 
                          ? `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`
                          : formData.location
                        }
                      </span>
                      <button
                        type="button"
                        onClick={openInGoogleMaps}
                        className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium whitespace-nowrap"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open in Google Maps
                      </button>
                    </div>
                  </div>
                )}
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

              <div>
                <label className="form-label">
                  <MapPin className="w-4 h-4 inline mr-2 text-primary-600" />
                  Property Address
                </label>
                <textarea
                  name="property_address"
                  value={formData.property_address || ""}
                  onChange={handleInputChange}
                  placeholder="Enter complete property address"
                  className="input-field min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">
                    <Ruler className="w-4 h-4 inline mr-2 text-primary-600" />
                    Road Size
                  </label>
                  <input
                    type="text"
                    name="road_size"
                    value={formData.road_size || ""}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., 30 ft"
                  />
                </div>

                <div>
                  <label className="form-label">
                    RERA Registered
                  </label>
                  <div className="flex gap-3 mb-2">
                    {["Yes", "No"].map((option) => (
                      <label
                        key={option}
                        className={cn(
                          "flex items-center gap-2 px-5 py-2.5 rounded-lg border cursor-pointer transition-all duration-200",
                          (option === "Yes" ? formData.rera_registered : !formData.rera_registered)
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-gray-200 hover:border-primary-300"
                        )}
                      >
                        <input
                          type="radio"
                          name="rera_registered_form"
                          checked={option === "Yes" ? formData.rera_registered : !formData.rera_registered}
                          onChange={() => setFormData(prev => ({
                            ...prev,
                            rera_registered: option === "Yes",
                            rera_number: option === "No" ? "" : prev.rera_number,
                          }))}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                  {formData.rera_registered && (
                    <input
                      type="text"
                      name="rera_number"
                      value={formData.rera_number || ""}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Enter RERA No."
                    />
                  )}
                </div>
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

              {/* Measurements Table */}
              <div>
                <h4 className="font-semibold text-gray-700 flex items-center gap-2 mt-4 mb-4">
                  <Ruler className="w-4 h-4 text-primary-600" />
                  Measurements
                </h4>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left text-sm font-medium text-gray-600">
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 w-28">Length</th>
                        <th className="px-4 py-3 w-28">Width</th>
                        <th className="px-4 py-3 w-28">Total</th>
                        <th className="px-4 py-3 w-14"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(formData.measurements || []).map((row, index) => {
                        const total = (row.length || 0) * (row.width || 0);
                        return (
                          <tr key={index} className="border-t border-gray-100">
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.description}
                                onChange={(e) => handleMeasurementChange(index, "description", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
                                placeholder="e.g., Hall"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="0.1"
                                value={row.length || ""}
                                onChange={(e) => handleMeasurementChange(index, "length", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="0.1"
                                value={row.width || ""}
                                onChange={(e) => handleMeasurementChange(index, "width", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-700">
                              {total > 0 ? total.toFixed(2) : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => removeMeasurementRow(index)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {(formData.measurements || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">
                            No measurements added yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {(formData.measurements || []).length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50">
                          <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">
                            Total Area:
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-primary-700">
                            {(formData.measurements || [])
                              .reduce((sum, row) => sum + (row.length || 0) * (row.width || 0), 0)
                              .toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                <button
                  type="button"
                  onClick={addMeasurementRow}
                  className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors border border-dashed border-primary-300"
                >
                  <Plus className="w-4 h-4" />
                  Add Row
                </button>
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

              {/* Critical Remarks */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <MessageSquareWarning className="w-4 h-4 text-red-500" />
                  Critical Remarks (if any)
                </h4>
                <textarea
                  name="critical_remarks"
                  value={formData.critical_remarks || ""}
                  onChange={handleInputChange}
                  disabled={isLocked}
                  className="input-field min-h-[120px]"
                  placeholder="Enter any critical observations, discrepancies, or important notes about this inspection..."
                />
              </div>
            </div>
          )}
        </fieldset>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 py-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex gap-3">
              {activeTab === "initial" ? (
                <button
                  onClick={() => router.push("/")}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to</span> Home
                </button>
              ) : (
                <button
                  onClick={goToPrevTab}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </button>
              )}
            </div>

            <div className="flex gap-3">
              {activeTab === "construction" ? (
                isLocked ? (
                  <button
                    onClick={() => router.push(`/preview/${id}`)}
                    className="btn-primary flex items-center gap-2"
                  >
                    View Preview
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSubmitConfirm(true)}
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
                )
              ) : (
                <button
                  onClick={goToNextTab}
                  className="btn-primary flex items-center gap-2 text-sm"
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

