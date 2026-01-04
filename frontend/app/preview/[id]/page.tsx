"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import { inspectionApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Inspection } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  Edit,
  Loader2,
  CheckCircle2,
  Building,
  User,
  MapPin,
  Calendar,
  Compass,
  Home,
  DollarSign,
  Wrench,
  Image,
} from "lucide-react";

export default function PreviewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [inspection, setInspection] = useState<Inspection | null>(null);

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
    } catch (error) {
      console.error("Error loading inspection:", error);
      alert("Failed to load inspection");
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const pdfUrl = inspectionApi.getPdfUrl(id);
      window.open(pdfUrl, "_blank");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/form/${id}`);
  };

  if (authLoading || isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!inspection) {
    return null;
  }

  const DataRow = ({ label, value }: { label: string; value?: string | boolean | string[] }) => {
    if (value === undefined || value === null || value === "") return null;
    
    let displayValue = value;
    if (typeof value === "boolean") {
      displayValue = value ? "Yes" : "No";
    } else if (Array.isArray(value)) {
      displayValue = value.join(", ");
    }
    
    return (
      <div className="flex border-b border-gray-100 py-2">
        <span className="text-gray-600 w-1/2 text-sm">{label}</span>
        <span className="text-gray-900 font-medium w-1/2 text-sm">{displayValue as string}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">
            Inspection Complete
          </h2>
          <p className="text-gray-500">
            Review your inspection details below and download the PDF report
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-8 animate-fade-in animation-delay-100">
          <button
            onClick={() => router.push("/")}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <button
            onClick={handleEdit}
            className="btn-secondary flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Form
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="btn-primary flex items-center gap-2"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PDF
          </button>
        </div>

        {/* Preview Content */}
        <div className="space-y-6 animate-fade-in animation-delay-200">
          {/* Header Card */}
          <div className="card p-6 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Building className="w-6 h-6" />
              <h3 className="font-heading text-xl font-bold">D.S. ENTERPRISES</h3>
            </div>
            <p className="text-primary-100 text-sm mb-4">
              Engineers, Approved Valuers & Project Consultants
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-primary-200 block">Employee</span>
                <span className="font-medium">{inspection.employee_name}</span>
              </div>
              <div>
                <span className="text-primary-200 block">Date</span>
                <span className="font-medium">{formatDate(inspection.inspection_date)}</span>
              </div>
              <div>
                <span className="text-primary-200 block">Location</span>
                <span className="font-medium">{inspection.location}</span>
              </div>
              <div>
                <span className="text-primary-200 block">Case Type</span>
                <span className="font-medium">{inspection.type_of_case || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="card p-6">
            <h3 className="section-title">
              <User className="w-5 h-5 text-primary-600" />
              Basic Information
            </h3>
            <div className="space-y-1">
              <DataRow label="Bank Name" value={inspection.bank_name} />
              <DataRow label="Applicant Name" value={inspection.applicant_name} />
              <DataRow label="Project Name" value={inspection.project_name} />
              <DataRow label="Property Address" value={inspection.property_address} />
              <DataRow label="Landmark" value={inspection.landmark} />
              <DataRow label="Person Met at Site" value={inspection.person_met_at_site} />
              <DataRow label="Relation with Applicant" value={inspection.relation_with_applicant} />
            </div>
          </div>

          {/* Property Details */}
          <div className="card p-6">
            <h3 className="section-title">
              <Building className="w-5 h-5 text-primary-600" />
              Property Details
            </h3>
            <div className="space-y-1">
              <DataRow label="Number of Floors" value={inspection.num_floors} />
              <DataRow label="Total Buildings" value={inspection.total_buildings} />
              <DataRow label="Number of Wings" value={inspection.num_wings} />
              <DataRow label="Total Flats" value={inspection.total_flats} />
              <DataRow label="Flats Per Floor" value={inspection.per_floor_flats} />
              <DataRow label="Flat Type" value={inspection.flat_type} />
              <DataRow label="Carpet Area" value={inspection.carpet_area} />
              <DataRow label="Super Built Up Area" value={inspection.super_built_up_area} />
              <DataRow label="Number of Lifts" value={inspection.num_lifts} />
            </div>
          </div>

          {/* Boundaries */}
          <div className="card p-6">
            <h3 className="section-title">
              <Compass className="w-5 h-5 text-primary-600" />
              Boundaries
            </h3>
            <div className="space-y-1">
              <DataRow label="East" value={inspection.boundary_east} />
              <DataRow label="West" value={inspection.boundary_west} />
              <DataRow label="North" value={inspection.boundary_north} />
              <DataRow label="South" value={inspection.boundary_south} />
            </div>
          </div>

          {/* Occupancy */}
          <div className="card p-6">
            <h3 className="section-title">
              <Home className="w-5 h-5 text-primary-600" />
              Occupancy Details
            </h3>
            <div className="space-y-1">
              <DataRow label="Occupancy Status" value={inspection.occupancy_status} />
              <DataRow label="Occupant Name" value={inspection.occupant_name} />
              <DataRow label="Occupied Since" value={inspection.occupied_since} />
              <DataRow label="Building Occupancy" value={inspection.building_occupancy_percent} />
              <DataRow label="Age of Building" value={inspection.age_of_building} />
              <DataRow label="Surrounding Development" value={inspection.surrounding_development_percent} />
            </div>
          </div>

          {/* Financial */}
          <div className="card p-6">
            <h3 className="section-title">
              <DollarSign className="w-5 h-5 text-primary-600" />
              Financial & Distance
            </h3>
            <div className="space-y-1">
              <DataRow label="Approx Rent" value={inspection.approx_rent} />
              <DataRow label="Market Rate" value={inspection.market_rate} />
              <DataRow label="Distance from Railway" value={inspection.distance_railway} />
              <DataRow label="Distance from Bus Stop" value={inspection.distance_bus} />
              <DataRow label="Distance from Hospital/School" value={inspection.distance_hospital} />
            </div>
          </div>

          {/* Amenities */}
          <div className="card p-6">
            <h3 className="section-title">
              <Wrench className="w-5 h-5 text-primary-600" />
              Amenities
            </h3>
            <div className="space-y-1">
              <DataRow label="Flooring" value={inspection.flooring_type} />
              <DataRow label="Kitchen Platform" value={inspection.kitchen_platform} />
              <DataRow label="Wall Tiles (Kitchen)" value={inspection.wall_tiles_kitchen} />
              <DataRow label="Wall Tiles (Toilet)" value={inspection.wall_tiles_toilet} />
              <DataRow label="Windows" value={inspection.windows_type} />
              <DataRow label="M.S. Grill" value={inspection.ms_grill} />
            </div>
          </div>

          {/* Construction Status */}
          {(inspection.rcc_work || inspection.brick_work) && (
            <div className="card p-6">
              <h3 className="section-title">
                <Building className="w-5 h-5 text-primary-600" />
                Construction Status
              </h3>
              <div className="space-y-1">
                <DataRow label="RCC Work" value={inspection.rcc_work} />
                <DataRow label="Brick Work" value={inspection.brick_work} />
                <DataRow label="Internal Plaster" value={inspection.internal_plaster} />
                <DataRow label="External Plaster" value={inspection.external_plaster} />
                <DataRow label="Flooring" value={inspection.flooring_work} />
                <DataRow label="Window/Door Fitting" value={inspection.window_door_fitting} />
                <DataRow label="Painting & Finishing" value={inspection.painting_finishing} />
                <DataRow label="Labours at Site" value={inspection.labours_at_site} />
                <DataRow label="Number of Labours" value={inspection.num_labours} />
                <DataRow label="Construction Material at Site" value={inspection.construction_material_at_site} />
              </div>
            </div>
          )}

          {/* Photos */}
          {inspection.photos && inspection.photos.length > 0 && (
            <div className="card p-6">
              <h3 className="section-title">
                <Image className="w-5 h-5 text-primary-600" />
                Site Photos
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {inspection.photos.map((photo) => (
                  <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={`http://localhost:8080${photo.file_path}`}
                      alt={photo.file_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

