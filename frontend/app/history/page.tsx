"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { inspectionApi } from "@/lib/api";
import type { Inspection } from "@/lib/types";
import { formatDate, cn } from "@/lib/utils";
import {
  Search,
  FileText,
  Calendar,
  MapPin,
  User,
  Loader2,
  ChevronRight,
  Trash2,
  AlertCircle,
} from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    try {
      const data = await inspectionApi.getAll();
      setInspections(data);
    } catch (error) {
      console.error("Error loading inspections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this inspection?")) return;
    
    setDeletingId(id);
    try {
      await inspectionApi.delete(id);
      setInspections((prev) => prev.filter((i) => i.id !== id));
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Failed to delete inspection");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredInspections = inspections.filter((i) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (i.employee_name || "").toLowerCase().includes(term);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "submitted":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <h2 className="font-heading text-2xl font-bold text-gray-900">
              Inspection History
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              View and manage all your property inspections
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by employee name..."
              className="input-field pl-10 w-full sm:w-64"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="card p-12 text-center animate-fade-in">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No inspections found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm
                ? "Try a different search term"
                : "Start by creating a new property inspection"}
            </p>
            <button
              onClick={() => router.push("/")}
              className="btn-primary"
            >
              Create New Inspection
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in animation-delay-100">
            {filteredInspections.map((inspection) => (
              <div
                key={inspection.id}
                onClick={() =>
                  router.push(
                    inspection.status === "submitted" || inspection.status === "completed"
                      ? `/preview/${inspection.id}`
                      : `/form/${inspection.id}`
                  )
                }
                className="card p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-all duration-300 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {inspection.location || "Untitled Inspection"}
                        </h3>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                            getStatusColor(inspection.status)
                          )}
                        >
                          {inspection.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {inspection.employee_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(inspection.inspection_date)}
                        </span>
                        {inspection.applicant_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {inspection.applicant_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDelete(inspection.id, e)}
                      disabled={deletingId === inspection.id}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                    >
                      {deletingId === inspection.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

