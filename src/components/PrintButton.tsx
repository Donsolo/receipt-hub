"use client";

export default function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 border border-[var(--border)] shadow-sm text-sm font-medium rounded-md text-[var(--text)] bg-[var(--card)] hover:bg-[var(--card-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
            Print
        </button>
    );
}
