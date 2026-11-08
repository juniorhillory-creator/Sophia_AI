interface EditorToolbarProps {
  wordCount: number;
  charCount: number;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  onFormat: (type: "h1" | "h2" | "bold" | "italic" | "list" | "quote") => void;
  onExport: (format: "md" | "txt") => void;
  onCopyAll: () => void;
  hasActivePaper: boolean;
}

export function EditorToolbar({
  wordCount,
  charCount,
  drawerOpen,
  onToggleDrawer,
  onFormat,
  onExport,
  onCopyAll,
  hasActivePaper,
}: EditorToolbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 shadow-xs">
      {/* Formatting Tools */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
        <button
          type="button"
          onClick={() => onFormat("h1")}
          className="rounded p-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900 font-bold text-xs"
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => onFormat("h2")}
          className="rounded p-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900 font-bold text-xs"
          title="Heading 2"
        >
          H2
        </button>
        <div className="h-4 w-[1px] bg-stone-200 mx-1" />
        <button
          type="button"
          onClick={() => onFormat("bold")}
          className="rounded p-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900 font-bold text-xs"
          title="Bold (**text**)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => onFormat("italic")}
          className="rounded p-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900 italic text-xs font-serif"
          title="Italic (*text*)"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => onFormat("list")}
          className="rounded p-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
          title="Bullet List (- item)"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onFormat("quote")}
          className="rounded p-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
          title="Blockquote (> quote)"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
          </svg>
        </button>
      </div>

      {/* Metrics & Actions */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-stone-500">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{charCount} chars</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCopyAll}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
            title="Copy draft to clipboard"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => onExport("md")}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
            title="Export as Markdown (.md)"
          >
            Export .md
          </button>
          <button
            type="button"
            onClick={onToggleDrawer}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              drawerOpen
                ? "bg-brand text-white shadow-xs"
                : "border border-brand/30 bg-brand-light text-brand hover:bg-brand/15"
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span>Research Drawer</span>
            {hasActivePaper && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Paper connected" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

