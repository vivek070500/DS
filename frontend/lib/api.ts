import axios from "axios";
import type { Inspection, CreateInspectionRequest, UpdateInspectionRequest } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const inspectionApi = {
  // Create a new inspection
  create: async (data: CreateInspectionRequest): Promise<Inspection> => {
    const response = await api.post("/api/inspections", data);
    return response.data;
  },

  // Get inspection by ID
  getById: async (id: string): Promise<Inspection> => {
    const response = await api.get(`/api/inspections/${id}`);
    return response.data;
  },

  // Get all inspections
  getAll: async (): Promise<Inspection[]> => {
    const response = await api.get("/api/inspections");
    return response.data;
  },

  // Update inspection
  update: async (id: string, data: UpdateInspectionRequest): Promise<Inspection> => {
    const response = await api.put(`/api/inspections/${id}`, data);
    return response.data;
  },

  // Delete inspection
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/inspections/${id}`);
  },

  // Upload photos
  uploadPhotos: async (id: string, files: File[]): Promise<void> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("photos", file);
    });
    await api.post(`/api/inspections/${id}/photos`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Delete photo
  deletePhoto: async (inspectionId: string, photoId: string): Promise<void> => {
    await api.delete(`/api/inspections/${inspectionId}/photos/${photoId}`);
  },

  // Get PDF download URL
  getPdfUrl: (id: string): string => {
    return `${API_BASE_URL}/api/inspections/${id}/pdf`;
  },
};

export default api;

