"use client";

export default function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 border border-[#2D3748] shadow-sm text-sm font-medium rounded-md text-gray-100 bg-[#1F2937] hover:bg-[#243043] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
            Print
        </button>
    );
}
