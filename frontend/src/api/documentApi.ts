import { apiClient, API_BASE, ACCESS_TOKEN_KEY } from "./axiosInstance";
import type { Document } from "../types";

export const documentApi = {
  async uploadDocument(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await apiClient.post<Document>("/documents", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    return response.data;
  },

  async listDocuments(limit = 50, offset = 0): Promise<Document[]> {
    const response = await apiClient.get<Document[]>("/documents", {
      params: { limit, offset },
    });
    return response.data;
  },

  async getDocument(id: string): Promise<Document> {
    const response = await apiClient.get<Document>(`/documents/${id}`);
    return response.data;
  },

  async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },

  getDocumentFileUrl(id: string): string {
    return `${API_BASE}/api/v1/documents/${id}/file`;
  },

  async fetchPdfBlob(id: string): Promise<Blob> {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const response = await fetch(`${API_BASE}/api/v1/documents/${id}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error(`Failed to load PDF (${response.status})`);
    }
    return response.blob();
  },
};

// Convenience named exports
export const uploadDocument = documentApi.uploadDocument;
export const listDocuments = documentApi.listDocuments;
export const fetchDocuments = documentApi.listDocuments;
export const getDocument = documentApi.getDocument;
export const fetchDocumentById = documentApi.getDocument;
export const deleteDocument = documentApi.deleteDocument;
export const getDocumentFileUrl = documentApi.getDocumentFileUrl;
export const fetchPdfBlob = documentApi.fetchPdfBlob;
