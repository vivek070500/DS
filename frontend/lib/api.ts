import axios from "axios";
import type { 
  Inspection, 
  CreateInspectionRequest, 
  UpdateInspectionRequest,
  User,
  LoginResponse,
  CreateUserRequest,
  UpdateUserRequest
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const TOKEN_KEY = "ds_auth_token";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem("ds_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  // Login with Google
  loginWithGoogle: async (googleToken: string): Promise<LoginResponse> => {
    const response = await api.post("/api/auth/google", { google_token: googleToken });
    return response.data;
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get("/api/auth/me");
    return response.data;
  },
};

// User Management API (Admin only)
export const userApi = {
  // Get all users
  getAll: async (): Promise<User[]> => {
    const response = await api.get("/api/users");
    return response.data;
  },

  // Create a new user
  create: async (data: CreateUserRequest): Promise<User> => {
    const response = await api.post("/api/users", data);
    return response.data;
  },

  // Update user
  update: async (id: string, data: UpdateUserRequest): Promise<User> => {
    const response = await api.put(`/api/users/${id}`, data);
    return response.data;
  },

  // Delete user
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/users/${id}`);
  },
};

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

  // Get PDF download URL (with auth token)
  getPdfUrl: (id: string): string => {
    return `${API_BASE_URL}/api/inspections/${id}/pdf`;
  },

  // Download PDF with auth
  downloadPdf: async (id: string): Promise<Blob> => {
    const response = await api.get(`/api/inspections/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default api;
