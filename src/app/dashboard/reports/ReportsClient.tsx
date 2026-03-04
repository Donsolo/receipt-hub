"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";

interface ReportsClientProps {
    isPro: boolean;
}

export default function ReportsClient({ isPro }: ReportsClientProps) {
    const [datePreset, setDatePreset] = useState("Last 30 days");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reportType, setReportType] = useState("Summary Report");
    const [isGenerating, setIsGenerating] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showRawOcr, setShowRawOcr] = useState(false);

    const isCustomDate = datePreset === "Custom Range";

    // Core restrict >30 days if custom
    let isOver30Days = false;
    if (!isPro && isCustomDate && startDate && endDate) {
        const pStart = new Date(startDate);
        const pEnd = new Date(endDate);
        if (!isNaN(pStart.getTime()) && !isNaN(pEnd.getTime())) {
            const diffDays = Math.ceil((pEnd.getTime() - pStart.getTime()) / (1000 * 3600 * 24));
            if (diffDays > 30) {
                isOver30Days = true;
            }
        }
    }

    const isLockedReportType = !isPro && reportType !== "Summary Report";
    const canGenerate = !isLockedReportType && !isOver30Days;

    const handleGenerate = () => {
        if (!canGenerate) return;
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            setShowPreview(true);
            document.getElementById("report-preview-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 600);
    };

    const triggerReport = (type: string) => {
        if (!isPro && type !== "Summary Report") {
            alert("Upgrade to Pro to unlock this report");
            return;
        }
        setReportType(type);
        if (isOver30Days) return;

        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            setShowPreview(true);
            document.getElementById("report-preview-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 600);
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] p-4 sm:p-8">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Breadcrumb */}
                <div className="text-sm font-medium text-[var(--muted)] flex items-center gap-2">
                    <Link href="/dashboard" className="hover:text-[var(--text)] transition-colors">Dashboard</Link>
                    <span>/</span>
                    <span className="text-[var(--text)]">Reports</span>
                </div>

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight">Reports</h1>
                        <p className="text-sm text-[var(--muted)] mt-1 max-w-lg">Turn your receipts into clean summaries and exportable insights.</p>
                    </div>
                    <div>
                        {isPro ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 shadow-sm shadow-yellow-500/10 tracking-widest uppercase">
                                PRO
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-900/40 text-indigo-300 border border-indigo-800/50 tracking-widest uppercase">
                                CORE
                            </span>
                        )}
                    </div>
                </div>

                {/* 1. Generate Report Card */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow space-y-6">
                    <h2 className="text-lg font-semibold text-[var(--text)]">Generate Report</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Date Range Selector */}
                        <div className="space-y-3">
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest">Date Range</label>
                            <select
                                value={datePreset}
                                onChange={(e) => { setDatePreset(e.target.value); setShowPreview(false); }}
                                className="block w-full border border-[var(--border)] rounded-xl py-2.5 px-3 text-sm text-[var(--text)] bg-[var(--bg-surface)] focus:ring-2 focus:ring-blue-500/40 transition-all cursor-pointer"
                            >
                                <option value="Last 7 days">Last 7 days</option>
                                <option value="Last 30 days">Last 30 days</option>
                                <option value="This Month">This Month</option>
                                <option value="Last Month">Last Month</option>
                                <option value="Custom Range">Custom Range</option>
                            </select>

                            {isCustomDate && (
                                <div className="flex items-center gap-2 mt-3 animate-in fade-in slide-in-from-top-2">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => { setStartDate(e.target.value); setShowPreview(false); }}
                                        className="block w-full border border-[var(--border)] rounded-lg py-2 px-2 text-xs text-[var(--text)] bg-[var(--bg-surface)] [color-scheme:dark]"
                                    />
                                    <span className="text-[var(--muted)] text-sm">to</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => { setEndDate(e.target.value); setShowPreview(false); }}
                                        className="block w-full border border-[var(--border)] rounded-lg py-2 px-2 text-xs text-[var(--text)] bg-[var(--bg-surface)] [color-scheme:dark]"
                                    />
                                </div>
                            )}
                            {isOver30Days && !isPro && (
                                <p className="text-xs text-amber-500/90 mt-2 flex items-center gap-1.5 animate-in fade-in">
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    Core plans are limited to 30-day reporting windows.
                                </p>
                            )}
                        </div>

                        {/* Generate Button Wrapper */}
                        <div className="flex items-end">
                            <button
                                onClick={handleGenerate}
                                disabled={!canGenerate || isGenerating}
                                className={clsx(
                                    "w-full h-[48px] px-4 rounded-xl text-[15px] font-semibold transition-all duration-200 flex items-center justify-center gap-2",
                                    (canGenerate && !isGenerating)
                                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.2)]"
                                        : "bg-[var(--bg-surface)] text-white/40 border border-[var(--border)] cursor-not-allowed"
                                )}
                            >
                                {isGenerating ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white/60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Generating...
                                    </>
                                ) : "Generate Preview"}
                            </button>
                        </div>

                    </div>

                    {/* Pro Call to Action Inline */}
                    {(!isPro && (isLockedReportType || isOver30Days)) && (
                        <div className="mt-4 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in zoom-in-95">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 shrink-0 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-[var(--text)]">Unlock Professional Details</h4>
                                    <p className="text-xs text-[var(--muted)] mt-0.5">Advanced reports, deep categorization, and infinite date ranges.</p>
                                </div>
                            </div>
                            <Link href="/upgrade" className="w-full sm:w-auto px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-amber-950 text-sm font-bold rounded-lg transition-colors text-center shadow-sm shadow-yellow-500/20">
                                Upgrade to Pro
                            </Link>
                        </div>
                    )}
                </div>

                {/* 2. Report Preview Card */}
                {/* 2. Report Preview Card */}
                <div id="report-preview-section" className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-6">Report Preview</h2>

                    {(!showPreview || !canGenerate) ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-white/5 rounded-xl bg-[var(--bg-surface)]">
                            <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-[var(--muted)] mb-4 shadow-inner">
                                <svg className="w-6 h-6 text-blue-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <p className="text-sm font-medium text-[var(--text)]">Your generated report preview will appear here.</p>
                            <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">Select your parameters above and click generate to begin.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* Summary View Mock */}
                            {reportType === "Summary Report" && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                                            <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Total Receipts</p>
                                            <p className="text-2xl font-semibold text-[var(--text)]">42</p>
                                        </div>
                                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                                            <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Total Income</p>
                                            <p className="text-2xl font-semibold text-emerald-400">$3,450.00</p>
                                        </div>
                                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                                            <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Total Expenses</p>
                                            <p className="text-2xl font-semibold text-red-400">$1,240.50</p>
                                        </div>
                                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <svg className="w-12 h-12 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
                                            </div>
                                            <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 relative z-10">Net Period</p>
                                            <p className="text-2xl font-semibold text-blue-400 relative z-10">$2,209.50</p>
                                        </div>
                                    </div>
                                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm overflow-hidden">
                                        <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Top Spending Categories</h3>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-left text-sm">
                                                <thead className="text-[11px] text-[var(--muted)] uppercase tracking-wider border-b border-white/5">
                                                    <tr>
                                                        <th className="font-medium px-4 py-3">Category</th>
                                                        <th className="font-medium px-4 py-3 text-right">Transactions</th>
                                                        <th className="font-medium px-4 py-3 text-right">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 text-[var(--text)]">
                                                    <tr className="hover:bg-[var(--card-hover)] transition-colors">
                                                        <td className="px-4 py-4 flex items-center gap-3">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div> Meals & Entertainment
                                                        </td>
                                                        <td className="px-4 py-4 text-right text-[var(--muted)]">14</td>
                                                        <td className="px-4 py-4 text-right font-medium">$450.20</td>
                                                    </tr>
                                                    <tr className="hover:bg-[var(--card-hover)] transition-colors">
                                                        <td className="px-4 py-4 flex items-center gap-3">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div> Office Supplies
                                                        </td>
                                                        <td className="px-4 py-4 text-right text-[var(--muted)]">8</td>
                                                        <td className="px-4 py-4 text-right font-medium">$320.00</td>
                                                    </tr>
                                                    <tr className="hover:bg-[var(--card-hover)] transition-colors">
                                                        <td className="px-4 py-4 flex items-center gap-3">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div> Software SaaS
                                                        </td>
                                                        <td className="px-4 py-4 text-right text-[var(--muted)]">5</td>
                                                        <td className="px-4 py-4 text-right font-medium">$190.99</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Category Breakdown (Pro Mock) */}
                            {reportType === "Category Breakdown" && (
                                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm overflow-hidden">
                                    <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Detailed Category Expenditure</h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-left text-sm">
                                            <thead className="text-[11px] text-[var(--muted)] uppercase tracking-wider border-b border-white/5">
                                                <tr>
                                                    <th className="font-medium px-4 py-3">Category</th>
                                                    <th className="font-medium px-4 py-3 text-right">Transactions</th>
                                                    <th className="font-medium px-4 py-3 text-right">% of Output</th>
                                                    <th className="font-medium px-4 py-3 text-right">Total Spent</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 text-[var(--text)]">
                                                <tr className="hover:bg-[var(--card-hover)] transition-colors">
                                                    <td className="px-4 py-4 font-medium text-purple-400">Travel & Flight</td>
                                                    <td className="px-4 py-4 text-right text-[var(--muted)]">3</td>
                                                    <td className="px-4 py-4 text-right">45%</td>
                                                    <td className="px-4 py-4 text-right font-medium">$1,200.00</td>
                                                </tr>
                                                <tr className="hover:bg-[var(--card-hover)] transition-colors">
                                                    <td className="px-4 py-4 font-medium text-emerald-400">Lodging</td>
                                                    <td className="px-4 py-4 text-right text-[var(--muted)]">2</td>
                                                    <td className="px-4 py-4 text-right">30%</td>
                                                    <td className="px-4 py-4 text-right font-medium">$850.50</td>
                                                </tr>
                                                <tr className="hover:bg-[var(--card-hover)] transition-colors">
                                                    <td className="px-4 py-4 font-medium text-blue-400">Meals</td>
                                                    <td className="px-4 py-4 text-right text-[var(--muted)]">12</td>
                                                    <td className="px-4 py-4 text-right">15%</td>
                                                    <td className="px-4 py-4 text-right font-medium">$425.25</td>
                                                </tr>
                                                <tr className="bg-white/[0.02] border-t border-[var(--border)]">
                                                    <td className="px-4 py-4 font-bold text-[var(--text)]">Tax Deductible Sum</td>
                                                    <td className="px-4 py-4 text-right">-</td>
                                                    <td className="px-4 py-4 text-right">-</td>
                                                    <td className="px-4 py-4 text-right font-bold text-[var(--text)]">$2,475.75</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Bundle Report (Pro Mock) */}
                            {reportType === "Bundle Report" && (
                                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm overflow-hidden">
                                    <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Tax Event Bundle Separation</h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-left text-sm whitespace-nowrap">
                                            <thead className="text-[11px] text-[var(--muted)] uppercase tracking-wider border-b border-white/5">
                                                <tr>
                                                    <th className="font-medium px-4 py-3">Bundle Container</th>
                                                    <th className="font-medium px-4 py-3 text-right">Child Assets</th>
                                                    <th className="font-medium px-4 py-3 text-center">Taxes Filed</th>
                                                    <th className="font-medium px-4 py-3 text-right">Total Aggregate</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 text-[var(--text)]">
                                                <tr className="hover:bg-[var(--card-hover)] transition-colors">
                                                    <td className="px-4 py-4 flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                        </div>
                                                        Quarter 1 Write Offs
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-[var(--muted)]">45 Receipts</td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Filed</span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-medium">$12,450.00</td>
                                                </tr>
                                                <tr className="hover:bg-[var(--card-hover)] transition-colors">
                                                    <td className="px-4 py-4 flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                        </div>
                                                        Las Vegas Convention
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-[var(--muted)]">12 Receipts</td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/5 text-white/40 border border-white/10">Pending</span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-medium">$3,840.45</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* OCR Detail Report (Pro Mock) */}
                            {reportType === "OCR Detail Report" && (
                                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm overflow-hidden">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                        <h3 className="text-sm font-semibold text-[var(--text)]">Raw AI OCR Extraction Grid</h3>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input type="checkbox" className="sr-only" checked={showRawOcr} onChange={(e) => setShowRawOcr(e.target.checked)} />
                                                <div className={`block w-9 h-5 rounded-full transition-colors ${showRawOcr ? 'bg-blue-600' : 'bg-[var(--border)]'}`}></div>
                                                <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${showRawOcr ? 'transform translate-x-4' : ''}`}></div>
                                            </div>
                                            <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--muted)] group-hover:text-[var(--text)] transition-colors select-none">Show JSON Output</span>
                                        </label>
                                    </div>

                                    {showRawOcr ? (
                                        <div className="bg-[#0D1117] rounded-xl p-4 overflow-auto border border-[var(--border)] max-h-[300px] custom-scrollbar">
                                            <pre className="text-xs text-blue-300/90 font-mono leading-relaxed">
                                                {`[
  {
    "id": "rcpt_9xf212",
    "vendor": "Home Depot",
    "date": "2026-02-27",
    "tx_subtotal": 142.50,
    "tx_tax": 11.40,
    "tx_total": 153.90,
    "payment_method": "VISA_CREDIT",
    "ai_confidence": 0.98,
    "ai_engine": "railway-local-ocr"
  },
  {
    "id": "rcpt_7ya441",
    "vendor": "Starbucks",
    "date": "2026-02-25",
    "tx_subtotal": 4.50,
    "tx_tax": 0.36,
    "tx_total": 4.86,
    "payment_method": "MASTERCARD",
    "ai_confidence": 0.99,
    "ai_engine": "railway-local-ocr"
  }
]`}
                                            </pre>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-left text-sm whitespace-nowrap">
                                                <thead className="text-[11px] uppercase tracking-widest text-[var(--muted)] border-b border-white/5">
                                                    <tr>
                                                        <th className="font-medium px-4 py-3">Vendor</th>
                                                        <th className="font-medium px-4 py-3">Date</th>
                                                        <th className="font-medium px-4 py-3 text-right">Subtotal</th>
                                                        <th className="font-medium px-4 py-3 text-right">Tax</th>
                                                        <th className="font-medium px-4 py-3 text-right">Total</th>
                                                        <th className="font-medium px-4 py-3 text-center">Payment</th>
                                                        <th className="font-medium px-4 py-3 text-right">Confidence</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 text-[var(--text)] font-mono text-xs">
                                                    <tr className="hover:bg-[var(--card-hover)] transition-colors">
                                                        <td className="px-4 py-3">Home Depot</td>
                                                        <td className="px-4 py-3 text-[var(--muted)]">2026-02-27</td>
                                                        <td className="px-4 py-3 text-right">$142.50</td>
                                                        <td className="px-4 py-3 text-right text-[var(--muted)]">$11.40</td>
                                                        <td className="px-4 py-3 text-right font-bold">$153.90</td>
                                                        <td className="px-4 py-3 text-center text-[var(--muted)]">VISA</td>
                                                        <td className="px-4 py-3 text-right text-emerald-400 font-bold">98%</td>
                                                    </tr>
                                                    <tr className="hover:bg-[var(--card-hover)] transition-colors">
                                                        <td className="px-4 py-3">Starbucks</td>
                                                        <td className="px-4 py-3 text-[var(--muted)]">2026-02-25</td>
                                                        <td className="px-4 py-3 text-right">$4.50</td>
                                                        <td className="px-4 py-3 text-right text-[var(--muted)]">$0.36</td>
                                                        <td className="px-4 py-3 text-right font-bold">$4.86</td>
                                                        <td className="px-4 py-3 text-center text-[var(--muted)]">MC</td>
                                                        <td className="px-4 py-3 text-right text-emerald-400 font-bold">99%</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Export Module */}
                            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div>
                                    <h3 className="text-sm font-semibold text-[var(--text)]">Ready to Export?</h3>
                                    <p className="text-xs text-[var(--muted)] mt-1 max-w-sm">Download this snapshot to pass directly to your accountant or import into your CRM.</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                    <button className="flex-1 md:flex-none px-4 py-2 border border-[var(--border)] hover:bg-[var(--card-hover)] text-[var(--text)] bg-[var(--bg-surface)] rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2">
                                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        Export CSV
                                    </button>

                                    {isPro ? (
                                        <>
                                            <button className="flex-1 md:flex-none px-4 py-2 border border-blue-500/30 hover:bg-blue-500/10 text-blue-400 bg-blue-500/5 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2 shadow-sm">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                Export PDF Doc
                                            </button>
                                            <button className="flex-1 md:flex-none px-4 py-2 border border-amber-500/30 hover:bg-amber-500/10 text-amber-500 bg-amber-500/5 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2 shadow-sm">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                                                Export JSON
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button disabled className="group relative flex-1 md:flex-none px-4 py-2 border border-[var(--border)] text-[var(--muted)]/50 bg-black/10 rounded-xl text-sm font-medium flex justify-center items-center gap-2 cursor-not-allowed">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Export PDF
                                            </button>
                                            <button disabled className="group relative flex-1 md:flex-none px-4 py-2 border border-[var(--border)] text-[var(--muted)]/50 bg-black/10 rounded-xl text-sm font-medium flex justify-center items-center gap-2 cursor-not-allowed">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Export JSON
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Available Report Types Card */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-6">Available Reports</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div
                            onClick={() => triggerReport("Summary Report")}
                            className="p-6 flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--card-hover)] cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                        >
                            <div className="mt-0.5 shrink-0 text-blue-400 bg-blue-500/10 p-3 rounded-full">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012-2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text)] group-hover:text-blue-400 transition-colors">Summary Report</h3>
                                <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">Overview of receipt totals and activity.</p>
                            </div>
                        </div>

                        <div
                            onClick={() => triggerReport("Category Breakdown")}
                            className="p-6 flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--card-hover)] cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                        >
                            <div className="mt-0.5 shrink-0 text-amber-500 bg-amber-500/10 p-3 rounded-full">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text)] group-hover:text-amber-500 transition-colors flex items-center gap-2">
                                    Category Breakdown
                                    {!isPro && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">🔒 Pro</span>}
                                </h3>
                                <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">Analyze spending by category.</p>
                            </div>
                        </div>

                        <div
                            onClick={() => triggerReport("Bundle Report")}
                            className="p-6 flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--card-hover)] cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                        >
                            <div className="mt-0.5 shrink-0 text-emerald-400 bg-emerald-500/10 p-3 rounded-full">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text)] group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                                    Bundle Report
                                    {!isPro && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">🔒 Pro</span>}
                                </h3>
                                <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">View totals grouped by project bundles.</p>
                            </div>
                        </div>

                        <div
                            onClick={() => triggerReport("OCR Detail Report")}
                            className="p-6 flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--card-hover)] cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                        >
                            <div className="mt-0.5 shrink-0 text-purple-400 bg-purple-500/10 p-3 rounded-full">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text)] group-hover:text-purple-400 transition-colors flex items-center gap-2">
                                    OCR Detail Report
                                    {!isPro && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">🔒 Pro</span>}
                                </h3>
                                <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">Export detailed receipt data extracted by OCR.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
