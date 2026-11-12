import React from "react";

export default function App() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-card border border-stone-200 p-8 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-light text-brand">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-950">
            Sophia AI
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Research Paper Assistant &bull; Ready for Claude Rebuild
          </p>
        </div>

        <div className="bg-stone-50 rounded-xl p-4 text-left border border-stone-200 text-xs text-stone-600 space-y-2">
          <p className="font-semibold text-stone-800">
            Backend API integration available at:
          </p>
          <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-stone-700">
            <li><code>src/api/client.ts</code> (Auth, PDF upload, RAG stream, Summaries)</li>
            <li><code>src/api/types.ts</code> (Complete TypeScript API schemas)</li>
            <li><code>src/index.css</code> (Tailwind CSS v4 & theme variables)</li>
          </ul>
        </div>

        <p className="text-xs text-stone-400">
          Clean baseline ready. Start building components and routes.
        </p>
      </div>
    </div>
  );
}
