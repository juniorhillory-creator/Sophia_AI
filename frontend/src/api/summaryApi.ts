import { apiClient } from "./axiosInstance";
import type { PaperSummary } from "../types";

export const summaryApi = {
  async createSummary(documentId: string): Promise<PaperSummary> {
    const response = await apiClient.post<PaperSummary>(`/documents/${documentId}/summary`);
    return response.data;
  },

  async getSummary(documentId: string): Promise<PaperSummary> {
    const response = await apiClient.get<PaperSummary>(`/documents/${documentId}/summary`);
    return response.data;
  },
};

