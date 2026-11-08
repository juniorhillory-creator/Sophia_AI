/** JSON shapes from backend Pydantic models. Datetimes and UUIDs arrive as strings. */

export interface ErrorBody {
  code: string;
  message: string;
}

export interface HealthResponse {
  status: "ok";
}

export interface Document {
  id: string;
  filename: string;
  page_count: number;
  chunk_count: number;
  created_at: string;
}

export interface Chunk {
  chunk_id: string;
  document_id: string;
  page_number: number;
  index_on_page: number;
  text: string;
}

export interface ChunkList {
  document_id: string;
  chunks: Chunk[];
}

export interface QuestionRequest {
  question: string;
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

export interface PaperSummary {
  title: string;
  authors: string;
  abstract: string;
  problem_statement: string;
  methodology: string;
  key_results: string;
  conclusion: string;
}

export const NOT_FOUND = "Not found in the paper.";

export const INSUFFICIENT = "The paper does not contain sufficient information.";

// --- Authentication types ---

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
<<<<<<< HEAD
  last_login_at?: string | null;
=======
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
}

export interface LoginRequest {
  username_or_email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface ForgotPasswordRequest {
  username_or_email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
  confirm_password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface GoogleAuthRequest {
  code: string;
  redirect_uri: string;
}

export interface GoogleAuthResponse {
  user: User;
  tokens: AuthTokens;
  is_new_user: boolean;
}

export interface PasswordResetTokenResponse {
  message: string;
}

export const SUMMARY_SECTIONS = [
  { key: "abstract", label: "Abstract" },
  { key: "problem_statement", label: "Problem statement" },
  { key: "methodology", label: "Methodology" },
  { key: "key_results", label: "Key results" },
  { key: "conclusion", label: "Conclusion" },
] as const satisfies readonly { key: keyof PaperSummary; label: string }[];
