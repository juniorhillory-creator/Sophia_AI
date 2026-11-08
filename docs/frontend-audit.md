# Sophia AI — Frontend Architecture & Audit

**Date:** November 2026  
**Auditor:** Antigravity AI  
**Scope:** Complete inspection of `frontend/src` architecture, pages, components, API client, routing, and styling.

---

## 1. Technical Stack & Versions

- **Core Library:** React 19.1.0 (`react`, `react-dom`)
- **Build Tool:** Vite 6.3.0 (`@vitejs/plugin-react`)
- **Language:** TypeScript 5.8.0
- **Routing:** React Router DOM 7.18.5 (`BrowserRouter`, `Routes`, `Route`, `Navigate`, `useNavigate`, `useLocation`)
- **Styling:** Tailwind CSS v4.1.0 (`@tailwindcss/vite` with `@theme` token definitions in `src/index.css`)
- **PDF Engine:** `pdfjs-dist` 4.10.38 with custom Web Worker bundle
- **Testing:** Vitest 3.1.0 (`vitest run`)

---

## 2. Current Routes & Page Hierarchy

```
/ (redirects to /dashboard)
├── /login                → LoginPage
├── /register             → RegisterPage
├── /forgot-password      → ForgotPasswordPage
├── /reset-password       → ResetPasswordPage
├── /auth/google/callback → GoogleCallbackPage
├── /dashboard            → ProtectedRoute > DashboardPage
├── /papers               → ProtectedRoute > (currently redirects to /dashboard)
├── /upload               → (redirects to /)
├── /workspace            → ProtectedRoute > WorkspacePage
└── /workspace/:documentId→ WorkspacePage (public/protected)
```

---

## 3. Reusable Component Inventory

| Component | Path | Current Purpose | Reusability in Redesign |
|---|---|---|---|
| `PdfViewer` | `src/components/PdfViewer.tsx` | Renders PDF pages onto an HTML5 Canvas using PDF.js with resizing observer and page navigation. | **High**: Extremely solid canvas implementation. Needs upgrade to accept `File | Blob | string (URL)` so it can load remote PDFs. |
| `SummaryPanel` | `src/components/SummaryPanel.tsx` | Calls `createSummary`, displays structured academic sections (abstract, problem statement, methodology, key results, conclusion), section-by-section clipboard copy. | **High**: Directly maps to backend `PaperSummary` schema. Can be styled to match SciSpace side-by-side card format. |
| `ChatPanel` | `src/components/ChatPanel.tsx` | RAG interactive chat with suggested academic questions, message list, citations toggle, and page jump trigger `onOpenPage(page)`. | **High**: High quality, handles `[1] Page X` source jumps. Can support streaming via `askQuestionStream`. |
| `Sidebar` | `src/components/Sidebar.tsx` | Left-side collapsible navigation with links to Dashboard, Papers, Upload, Settings, and Sign out. | **Medium**: Needs refinement to match the SciSpace academic workspace layout (collapsed icons, active pills, research workspace shortcuts). |
| `DashboardHeader` | `src/components/DashboardHeader.tsx` | Top application header with mobile hamburger, breadcrumb, and user profile badge. | **Medium**: Needs cleaner academic aesthetic. |
| `DocumentCard` | `src/components/DocumentCard.tsx` | Card displaying document title, page count, chunk count, date, processing badge, open/delete actions. | **High**: Reusable in Dashboard and My Papers list. |
| `EmptyState` / `LoadingSkeleton` | `src/components/EmptyState.tsx` | Visual empty states with actionable buttons and skeleton loading states. | **High**: Clean, reusable. |
| `ProtectedRoute` | `src/components/ProtectedRoute.tsx` | Guards routes requiring authentication; redirects unauthenticated users to `/login`. | **Keep**: Core security wrapper. |
| `PasswordInput` / `GoogleButton` | `src/components/` | Authentication form helpers. | **Keep**: Accessible input with visibility toggle. |

---

## 4. API Client & State Management Audit

### 4.1 Token & Auth State
- Managed in `src/contexts/AuthContext.tsx`.
- Tokens are held **strictly in memory** per security rules (never stored in `localStorage` or `sessionStorage` where XSS could exfiltrate them).
- Connected to `src/api/client.ts` via `setAuthToken(token)`.
- All requests (`uploadDocument`, `createSummary`, `getSummary`, `askQuestion`, `askQuestionStream`, `fetchDocuments`, `deleteDocument`) pass `Authorization: Bearer <token>`.

### 4.2 Identified Gaps in Current Frontend
1. **`DashboardPage` does not fetch existing documents on mount**:
   - `const [documents, setDocuments] = useState<Document[]>(initialDocument ? [initialDocument] : []);`
   - It only displays documents uploaded during the active session. It should call `fetchDocuments()` inside `useEffect` on mount!
2. **`WorkspacePage` fails when opening past documents**:
   - `WorkspacePage` expects `location.state.file` to be passed in memory.
   - When a user clicks an existing paper from the dashboard list or navigates to `/workspace/:documentId`, `state.file` is undefined, causing the workspace to show "No paper open".
   - *Fix*: If `state.file` is missing, `WorkspacePage` should fetch `GET /api/v1/documents/{id}/file` as a `Blob` and pass it to `PdfViewer`.
3. **Missing `My Research Papers` page**:
   - `/papers` currently redirects to `/dashboard`. Users need a dedicated searchable, filterable table/grid of their papers.
4. **Missing `AI Writer` page**:
   - SciSpace’s flagship capability is the AI Writer. Sophia AI has no writer page yet.
5. **Visual Architecture**:
   - The current UI feels like disjointed screens rather than a cohesive research studio.
   - SciSpace features a persistent left tool rail, clean typography, neutral academic gray/slate surfaces with purposeful accent highlights, split-pane reading/writing/chat environments, and document tabs.

---

## 5. Recommended Redesign Structure

We will restructure the frontend into a unified research workspace:

1. **Navigation Rail (SciSpace-inspired)**:
   - Dashboard (`/dashboard`)
   - My Research Papers (`/papers`)
   - Research Workspace / Assistant (`/workspace` and `/workspace/:documentId`)
   - AI Writer (`/writer` and `/writer/:documentId`)
   - Account / Settings modal
2. **Research Workspace**:
   - Left: PDF Reader with zoom, page jump, thumbnail/page controls.
   - Right: Tabbed panel with **AI Summary** (structured cards) and **Research Assistant** (RAG streaming chat with clickable page citations).
3. **AI Writer**:
   - Centered distraction-free academic manuscript editor (title, abstract, sections, markdown/rich text).
   - Side panel: "Research Reference" pulling from the active uploaded paper's summary and RAG Q&A to insert grounded excerpts directly into the draft.
4. **Dashboard**:
   - Header with greeting & paper stats.
   - Quick Drag-and-Drop Upload card.
   - Recent Papers table with status pills, open in Reader, open in AI Writer, and delete actions.

