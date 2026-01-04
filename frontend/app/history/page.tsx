"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { inspectionApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
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
  Shield,
  Filter,
  X,
} from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadInspections();
    }
  }, [isAuthenticated]);

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

  const clearFilters = () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
  };

  const filteredInspections = inspections.filter((i) => {
    // For admin: filter by employee name if search term exists
    if (isAdmin && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      if (!(i.employee_name || "").toLowerCase().includes(term)) {
        return false;
      }
    }

    // Date filters (for both admin and users)
    if (dateFrom) {
      const inspectionDate = new Date(i.inspection_date);
      const fromDate = new Date(dateFrom);
      if (inspectionDate < fromDate) {
        return false;
      }
    }

    if (dateTo) {
      const inspectionDate = new Date(i.inspection_date);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // Include the entire day
      if (inspectionDate > toDate) {
        return false;
      }
    }

    return true;
  });

  const hasActiveFilters = searchTerm || dateFrom || dateTo;

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

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col gap-4 mb-6 sm:mb-8 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-gray-900">
                  Inspection History
                </h2>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    <Shield className="w-3 h-3" />
                    All Reports
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-1">
                {isAdmin 
                  ? "View and manage all property inspections" 
                  : "View and manage your property inspections"}
              </p>
            </div>

            {/* Filter Toggle Button (Mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-medium transition-all"
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
              )}
            </button>
          </div>

          {/* Filters */}
          <div className={cn(
            "flex flex-col sm:flex-row gap-3 sm:items-end",
            !showFilters && "hidden sm:flex"
          )}>
            {/* Employee Name Search - Admin Only */}
            {isAdmin && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Search by Employee
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Employee name..."
                    className="input-field pl-9 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Date From */}
            <div className={cn("flex-1", !isAdmin && "sm:max-w-[200px]")}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                From Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="input-field pl-9 py-2 text-sm"
                />
              </div>
            </div>

            {/* Date To */}
            <div className={cn("flex-1", !isAdmin && "sm:max-w-[200px]")}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                To Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="input-field pl-9 py-2 text-sm"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span>Showing:</span>
              {searchTerm && (
                <span className="px-2 py-1 bg-gray-100 rounded-lg">
                  Employee: "{searchTerm}"
                </span>
              )}
              {dateFrom && (
                <span className="px-2 py-1 bg-gray-100 rounded-lg">
                  From: {formatDate(dateFrom)}
                </span>
              )}
              {dateTo && (
                <span className="px-2 py-1 bg-gray-100 rounded-lg">
                  To: {formatDate(dateTo)}
                </span>
              )}
              <span className="text-gray-400">
                ({filteredInspections.length} result{filteredInspections.length !== 1 ? "s" : ""})
              </span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="card p-8 sm:p-12 text-center animate-fade-in">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No inspections found
            </h3>
            <p className="text-gray-500 mb-6 text-sm sm:text-base">
              {hasActiveFilters
                ? "Try adjusting your filters"
                : "Start by creating a new property inspection"}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => router.push("/")}
                className="btn-primary"
              >
                Create New Inspection
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 animate-fade-in animation-delay-100">
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
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                          {inspection.property_address || inspection.location || "Untitled Inspection"}
                        </h3>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0",
                            getStatusColor(inspection.status)
                          )}
                        >
                          {inspection.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 sm:w-4 sm:h-4" />
                          {inspection.employee_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                          {formatDate(inspection.inspection_date)}
                        </span>
                        {inspection.applicant_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                            {inspection.applicant_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => handleDelete(inspection.id, e)}
                      disabled={deletingId === inspection.id}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                    >
                      {deletingId === inspection.id ? (
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
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
