export type DocumentStatus = "processing" | "ready" | "failed";
export type ProcessingStage = "extracting" | "indexing" | "summarizing" | null;

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  title?: string;
  page_count: number;
  chunk_count: number;
  status: DocumentStatus;
  stage?: ProcessingStage;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Chunk {
  chunk_id: string;
  document_id: string;
  page_number: number;
  index_on_page: number;
  text: string;
}

export interface PaperSummary {
  title: string;
  authors: string;
  abstract: string;
  problem_statement: string;
  methodology: string;
  key_results: string;
  conclusion: string;
}

export interface SourceCitation {
  page: number;
  excerpt: string;
  chunk_id: string;
}

export interface ChatResponse {
  answer: string;
  sources: SourceCitation[];
  document_id: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

export interface AuthResponse {
  user: User;
  tokens: TokenResponse;
}

export interface ErrorBody {
  code: string;
  message: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: SourceCitation[];
  timestamp?: Date;
  createdAt?: string;
  isStreaming?: boolean;
  error?: string;
}
