"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import PhotoUploader from "@/components/PhotoUploader";
import { inspectionApi } from "@/lib/api";
import { 
  User, 
  MapPin, 
  Calendar, 
  UserCheck, 
  ArrowRight, 
  Loader2,
  Sparkles,
  Navigation,
  ExternalLink
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    employee_name: "",
    location: "",
    inspection_date: new Date().toISOString().split("T")[0],
    person_visited: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create inspection
      const inspection = await inspectionApi.create(formData);

      // Upload photos if any
      if (photos.length > 0) {
        await inspectionApi.uploadPhotos(inspection.id, photos);
      }

      // Navigate to form page
      router.push(`/form/${inspection.id}`);
    } catch (error) {
      console.error("Error creating inspection:", error);
      alert("Failed to create inspection. Please make sure the backend server is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    formData.employee_name.trim() !== "" &&
    formData.location.trim() !== "" &&
    formData.inspection_date !== "";

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Property Inspection System
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            New Property Inspection
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Start by entering the basic details and uploading site photos. 
            You can fill in the complete inspection form in the next step.
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="card p-6 sm:p-8 animate-fade-in animation-delay-100">
          <div className="space-y-6">
            {/* Employee Name */}
            <div>
              <label htmlFor="employee_name" className="form-label">
                <User className="w-4 h-4 inline mr-2 text-primary-600" />
                Employee Name
              </label>
              <input
                type="text"
                id="employee_name"
                name="employee_name"
                value={formData.employee_name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                className="input-field"
                required
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="form-label">
                <MapPin className="w-4 h-4 inline mr-2 text-primary-600" />
                Location
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Enter property location/address"
                  className="input-field flex-1"
                  required
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
              {(coordinates || formData.location) && (
                <button
                  type="button"
                  onClick={openInGoogleMaps}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Google Maps
                </button>
              )}
            </div>

            {/* Date & Person Visited - Side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="inspection_date" className="form-label">
                  <Calendar className="w-4 h-4 inline mr-2 text-primary-600" />
                  Inspection Date
                </label>
                <input
                  type="date"
                  id="inspection_date"
                  name="inspection_date"
                  value={formData.inspection_date}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label htmlFor="person_visited" className="form-label">
                  <UserCheck className="w-4 h-4 inline mr-2 text-primary-600" />
                  Person Visited
                </label>
                <input
                  type="text"
                  id="person_visited"
                  name="person_visited"
                  value={formData.person_visited}
                  onChange={handleInputChange}
                  placeholder="Name of person visited"
                  className="input-field"
                />
              </div>
            </div>

            {/* Photo Upload Section */}
            <div>
              <label className="form-label mb-4">
                📸 Upload Site Photos
              </label>
              <PhotoUploader photos={photos} onPhotosChange={setPhotos} />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Continue to Form
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>

      </main>
    </div>
  );
}

