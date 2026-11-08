import { useEffect, useRef } from "react";

interface EditorCanvasProps {
  title: string;
  onTitleChange: (title: string) => void;
  content: string;
  onContentChange: (content: string) => void;
  lastSavedAt: Date | null;
}

export function EditorCanvas({
  title,
  onTitleChange,
  content,
  onContentChange,
  lastSavedAt,
}: EditorCanvasProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to fit text
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 400)}px`;
  }, [content]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-12 lg:px-20 bg-stone-50/60 scrollbar-thin">
      <div className="mx-auto max-w-3xl rounded-xl border border-stone-200/80 bg-white p-8 sm:p-14 shadow-sm">
        {/* Manuscript Header */}
        <div className="border-b border-stone-100 pb-6 mb-6">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled Research Manuscript"
            className="w-full text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 border-none p-0 focus:outline-none focus:ring-0 placeholder:text-stone-300 font-sans"
          />
          <div className="mt-3 flex items-center gap-3 text-xs text-stone-400">
            <span>Academic Draft</span>
            <span>•</span>
            <span>
              {lastSavedAt
                ? `Auto-saved at ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : "Saved locally"}
            </span>
          </div>
        </div>

        {/* Writing Canvas */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Start drafting your synthesis, literature review, or findings here. Use the Research Drawer on the right to reference and cite your uploaded papers..."
          className="w-full resize-none border-none p-0 font-sans text-base leading-relaxed text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-0"
          style={{ minHeight: "450px" }}
        />
      </div>
    </div>
  );
}

