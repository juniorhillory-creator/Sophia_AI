# Sophia AI — Frontend Redesign Plan (SciSpace-Inspired)

**Date:** November 2026  
**Inspiration:** SciSpace AI Writer ([scispace.com/ai-writer](https://scispace.com/ai-writer))  
**Design Philosophy:** Academic precision, zero visual clutter, dense information hierarchy, split-pane research workflow, 100% backend groundedness.

---

## 1. Design Direction

SciSpace excels by treating researchers with seriousness: clean neutral grays, high-contrast readable text, dedicated multi-pane tools where reading, synthesis, and querying coexist without context switching.

Sophia AI adopts this workspace design while preserving its distinctive branding:
- **Brand Personality:** Intelligent, rigorous, grounded, dependable.
- **Surface Texture:** Warm paper-like tones (`stone-50` background, crisp white editor/panels, subtle `stone-200` hair-thin dividing borders).
- **Accents:** Sophia Terracotta (`#f26934`) for primary actions, subtle brand badges, and citations; emerald green (`#16a34a`) for ground-truth badges.

---

## 2. Color Palette & Design Tokens

Defined in `src/index.css` via Tailwind CSS v4 `@theme`:

| Token | Hex | Usage |
|---|---|---|
| `--color-brand` | `#f26934` | Primary actions, focused tab underlines, citation links |
| `--color-brand-dark` | `#c44e22` | Button hover states, active indicators |
| `--color-brand-light` | `#fff4ed` | Selected pills, highlight badges, alert tints |
| `--color-stone-50` | `#fafaf9` | Canvas background, workspace backdrop |
| `--color-stone-100` | `#f5f5f4` | Secondary button backgrounds, toolbar bars |
| `--color-stone-200` | `#e7e5e4` | Border lines, card dividers, table borders |
| `--color-stone-600` | `#57534e` | Secondary metadata, authors, timestamps, tooltips |
| `--color-stone-900` | `#1c1917` | Main text, document headings, active tab labels |
| `--color-success` | `#16a34a` | Verification checkmarks, 100% grounded citations |
| `--color-error` | `#dc2626` | Error states, delete confirmation |

---

## 3. Typography & Sizing

- **Primary Font:** Inter / Segoe UI (`font-sans`), clean geometric sans with high legibility.
- **Code & Citations:** JetBrains Mono (`font-mono`) for page markers `[p. 4]`, chunk IDs, file sizes.
- **Document Title:** 24px-30px, Bold, Tight tracking (`tracking-tight text-stone-900`).
- **Section Headers:** 14px, Semibold, Uppercase tracking for academic rigor (`text-xs font-semibold uppercase tracking-wider text-stone-500`).
- **Body & Prose:** 15px-16px, 1.6 line height for comfortable long-form reading.

---

## 4. Layout System & Navigation

### 4.1 Global Shell
- **Left Navigation Rail (64px collapsed, 240px expanded)**:
  - Sophia Logo + "AI" badge at top.
  - Navigation Icons:
    - **Dashboard** (Grid icon)
    - **My Papers** (Document stack icon)
    - **Research Workspace** (Split view icon)
    - **AI Writer** (Feather / Pen icon)
  - Bottom: User Avatar, profile popover, Sign Out.
- **Main Area**: Fluid height `100dvh`, flex column with minimal subheader breadcrumbs.

---

## 5. Screen-by-Screen Specifications

### 5.1 Dashboard (`/dashboard`)
1. **Header Banner**: "Welcome back, {Name}" with brief stats (e.g. "3 Papers in Library").
2. **Quick Upload Dropzone**: Compact, styled drag-and-drop card accepting `.pdf` up to 20 MB with immediate progress bar.
3. **Recent Papers Section**:
   - Clean data table / card grid showing Title, Page count, Chunks, Created date, Status badge (`Ready`).
   - Actions: **Read & Analyze** (opens `/workspace/{id}`), **Open in AI Writer** (opens `/writer/{id}`), **Delete** (with confirmation).
4. **Empty State**: Friendly illustration and "Upload your first research paper" button when 0 papers exist.

### 5.2 My Research Papers (`/papers`)
- Comprehensive library view of all uploaded papers fetched from `GET /api/v1/documents`.
- Includes live search filter by filename/title.
- Table columns: Title, Pages, Processed status, Date, Actions.

### 5.3 Research Paper Workspace (`/workspace/:documentId`)
SciSpace-style split-pane workspace:
- **Left Pane (50% default, resizable/collapsible)**:
  - **PDF Viewer (`PdfViewer`)**:
    - Floating bottom toolbar: Previous / Next page, page input field, zoom in/out, fit to width, full page count.
    - Responsive canvas rendering with automatic resolution scaling.
    - If accessed directly by URL, automatically streams PDF from `GET /api/v1/documents/{id}/file`.
- **Right Pane (50%)**:
  - Two primary tabs: **Structured Summary** and **Research Assistant**.
  - **Summary View**:
    - Metadata Header: Paper title, Authors.
    - Academic Sections: Abstract, Problem Statement, Methodology, Key Results, Conclusion.
    - Copy section button with checkmark animation.
    - "Send to AI Writer" action.
  - **Research Assistant View**:
    - Suggested paper questions.
    - Chat bubble feed showing User question and Grounded AI answer.
    - Source Citation cards with `[Page X]` badge that **navigates the left PDF viewer directly to that page on click**.
    - Real-time token streaming input with auto-scrolling.

### 5.4 AI Writer (`/writer` and `/writer/:documentId`)
Inspired directly by [scispace.com/ai-writer](https://scispace.com/ai-writer):
- **Top Bar**:
  - Manuscript Title input (editable).
  - Active Paper Selector dropdown (links drafting to an uploaded paper).
  - Word & Character counter.
  - Copy to Clipboard & Download (`.md` / `.txt`) actions.
- **Center Canvas**:
  - Distraction-free, centered writing area mimicking a paper manuscript.
  - Formatting toolbar: Bold, Italic, Heading 1, Heading 2, Bullet List, Quote, Citation insert.
  - Auto-saved to browser `localStorage` keyed by user ID and document.
- **Right Research Drawer (Collapsible)**:
  - **Paper Summary Tab**: View the selected paper's Objective, Methodology, and Findings alongside the draft.
  - **Grounding Query Tab**: Run questions against the active paper using `POST /api/v1/documents/{id}/questions` and insert the returned verified answer + citation directly into the cursor position.

### 5.5 Authentication Pages (`/login`, `/register`, `/forgot-password`, `/reset-password`)
- Centered academic card layout with Sophia AI insignia.
- Clean field validation (password strength indicators, matching password checks).
- Clear error alerts (`Invalid credentials`, `Account already registered`).

---

## 6. Component Hierarchy & Reorganization

```
src/
├── api/
│   ├── client.ts             (Core fetch, auth headers, token store, SSE generator)
│   ├── auth.ts               (Auth API endpoints)
│   └── types.ts              (Shared TypeScript interfaces)
├── contexts/
│   └── AuthContext.tsx       (Auth state, user profile, token auto-refresh)
├── components/
│   ├── Navigation/
│   │   ├── AppLayout.tsx     (Global layout with left Rail & TopHeader)
│   │   └── NavRail.tsx       (SciSpace-style compact left icon rail)
│   ├── PdfViewer/
│   │   └── PdfViewer.tsx     (Enhanced canvas PDF renderer with Blob/URL support)
│   ├── Research/
│   │   ├── SummaryPanel.tsx  (Structured paper summary cards)
│   │   └── ChatPanel.tsx     (RAG streaming chatbot with citation page jump)
│   ├── Writer/
│   │   ├── EditorCanvas.tsx  (Academic manuscript text editor)
│   │   ├── EditorToolbar.tsx (Formatting controls & export actions)
│   │   └── ReferenceDrawer.tsx (Side-drawer referencing paper summary & Q&A)
│   ├── Common/
│   │   ├── DocumentCard.tsx  (Paper card with badges and actions)
│   │   ├── EmptyState.tsx    (Clean empty states)
│   │   └── StatusBadge.tsx   (Processing / Ready badges)
└── pages/
    ├── DashboardPage.tsx     (Main dashboard with real API documents list)
    ├── PapersPage.tsx        (Dedicated My Papers searchable library)
    ├── WorkspacePage.tsx     (Split-pane PDF reader + Summary + Chat)
    ├── WriterPage.tsx        (SciSpace-inspired AI Writer workspace)
    └── Auth/
        ├── LoginPage.tsx
        ├── RegisterPage.tsx
        └── ForgotPasswordPage.tsx
```

---

## 7. Implementation Plan Phases

1. **Phase A — API Client & Viewer Upgrades**:
   - Update `PdfViewer.tsx` to accept `File | Blob | string (URL)`.
   - Add `fetchDocumentFile(documentId)` to `client.ts` returning a `Blob` with auth headers.
   - Add `fetchDocuments()` on mount in `DashboardPage`.
2. **Phase B — SciSpace Layout & Nav Rail**:
   - Create unified `AppLayout` and `NavRail` component with modern icons and active indicators.
3. **Phase C — Research Workspace Split View**:
   - Enhance `WorkspacePage` to seamlessly load remote documents by ID, connect citation clicks to PDF page jumps, and streamline tab switching between Summary and Chat.
4. **Phase D — AI Writer Workspace**:
   - Implement `WriterPage` with centered academic document editor, word count, local auto-save, and research reference drawer pulling from backend paper summaries and Q&A.
5. **Phase E — My Papers Library**:
   - Create dedicated `PapersPage.tsx` with search, filter, and document management.
6. **Phase F — Verification & Build**:
   - Run TypeScript checks, Vitest tests, and Vite production build.

