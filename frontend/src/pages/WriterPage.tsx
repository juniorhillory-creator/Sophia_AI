import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { fetchDocuments } from "../api/client";
import type { Document } from "../api/types";
import { useAuth } from "../contexts/AuthContext";
import { AppLayout } from "../components/Navigation/AppLayout";
import { EditorToolbar } from "../components/Writer/EditorToolbar";
import { EditorCanvas } from "../components/Writer/EditorCanvas";
import { ReferenceDrawer } from "../components/Writer/ReferenceDrawer";

const DEFAULT_TEMPLATE = `# Abstract

[Draft your abstract summarizing the research problem, methodology, and primary discoveries...]

## 1. Introduction & Background

## 2. Research Methodology

## 3. Key Findings & Discussion

## 4. Conclusion & Implications
`;

export function WriterPage() {
  const { documentId } = useParams<{ documentId?: string }>();
  const { user } = useAuth();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(documentId || null);
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Editor content state
  const storageKey = `sophia_draft_${user?.id || "anon"}_${selectedDocId || "main"}`;
  const [title, setTitle] = useState("Research Synthesis Manuscript");
  const [content, setContent] = useState(DEFAULT_TEMPLATE);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Load user's uploaded papers
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const docs = await fetchDocuments();
        if (active) setDocuments(docs);
      } catch {
        // Handle gracefully
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Restore draft from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.content) setContent(parsed.content);
        if (parsed.savedAt) setLastSavedAt(new Date(parsed.savedAt));
      }
    } catch {
      // Ignore parse errors
    }
  }, [storageKey]);

  // Auto-save debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const now = new Date();
        localStorage.setItem(
          storageKey,
          JSON.stringify({ title, content, savedAt: now.toISOString() }),
        );
        setLastSavedAt(now);
      } catch {
        // storage quota exceeded or disabled
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, content, storageKey]);

  // Calculate metrics
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;

  const handleFormat = (type: "h1" | "h2" | "bold" | "italic" | "list" | "quote") => {
    const prefixMap = {
      h1: "\n# ",
      h2: "\n## ",
      bold: "**Bold Text**",
      italic: "*Italic Text*",
      list: "\n- ",
      quote: "\n> ",
    };
    setContent((prev) => `${prev}${prefixMap[type]}`);
  };

  const handleInsertText = useCallback((snippet: string) => {
    setContent((prev) => `${prev}\n${snippet}`);
  }, []);

  const handleExport = (format: "md" | "txt") => {
    const mime = format === "md" ? "text/markdown" : "text/plain";
    const fullText = `# ${title}\n\n${content}`;
    const blob = new Blob([fullText], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/gi, "_")}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = () => {
    const fullText = `# ${title}\n\n${content}`;
    void navigator.clipboard.writeText(fullText);
  };

  return (
    <AppLayout>
      <div className="flex h-full flex-col min-w-0">
        <EditorToolbar
          wordCount={words}
          charCount={chars}
          drawerOpen={drawerOpen}
          onToggleDrawer={() => setDrawerOpen((prev) => !prev)}
          onFormat={handleFormat}
          onExport={handleExport}
          onCopyAll={handleCopyAll}
          hasActivePaper={Boolean(selectedDocId)}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <EditorCanvas
            title={title}
            onTitleChange={setTitle}
            content={content}
            onContentChange={setContent}
            lastSavedAt={lastSavedAt}
          />

          {drawerOpen && (
            <ReferenceDrawer
              documents={documents}
              selectedDocumentId={selectedDocId}
              onSelectDocument={setSelectedDocId}
              onInsertText={handleInsertText}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

