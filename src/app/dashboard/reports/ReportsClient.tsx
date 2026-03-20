"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import PageHeaderCard from '@/components/ui/PageHeaderCard';
import { generateReportData } from '@/lib/reportActions';
import { subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

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
    const [reportData, setReportData] = useState<any>(null);

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

    const performGeneration = async (targetType: string) => {
        if (!isPro && targetType !== "Summary Report") {
            alert("Upgrade to Pro to unlock this report");
            return;
        }
        if (isOver30Days) return;

        setIsGenerating(true);
        try {
            let sDate = new Date();
            let eDate = new Date();

            if (datePreset === "Last 7 days") {
                sDate = subDays(new Date(), 7);
            } else if (datePreset === "Last 30 days") {
                sDate = subDays(new Date(), 30);
            } else if (datePreset === "This Month") {
                sDate = startOfMonth(new Date());
                eDate = endOfMonth(new Date());
            } else if (datePreset === "Last Month") {
                const lastM = subMonths(new Date(), 1);
                sDate = startOfMonth(lastM);
                eDate = endOfMonth(lastM);
            } else if (datePreset === "Custom Range" && startDate && endDate) {
                sDate = new Date(startDate);
                eDate = new Date(endDate);
            }

            const data = await generateReportData(sDate.toISOString(), eDate.toISOString());
            setReportData(data);
            setReportType(targetType);
            setShowPreview(true);

            setTimeout(() => {
                document.getElementById("report-preview-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
        } catch (e: any) {
            console.error(e);
            alert("Failed to generate report: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Breadcrumb */}
                <div className="text-sm font-medium text-[var(--muted)] flex items-center gap-2">
                    <Link href="/dashboard" className="hover:text-[var(--text)] transition-colors">Dashboard</Link>
                    <span>/</span>
                    <span className="text-[var(--text)]">Reports</span>
                </div>

                {/* Header Section */}
                <PageHeaderCard
                    title="Reports"
                    description="Turn your receipts into clean summaries and exportable insights."
                    badge={isPro ? "PRO" : "CORE"}
                />

                {/* 1. Generate Report Card */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow space-y-6">
                    <h2 className="text-lg font-semibold text-[var(--text)]">Generate Report</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Date Range Selector */}
                        <div className="space-y-3">
                            <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">Date Range</label>
                            <select
                                value={datePreset}
                                onChange={(e) => { setDatePreset(e.target.value); setShowPreview(false); }}
                                className="block w-full border border-[var(--border)] rounded-xl py-2.5 px-3 text-sm text-[var(--text)] bg-[var(--bg)] focus:ring-2 focus:ring-blue-500/40 transition-all cursor-pointer"
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
                                        className="block w-full border border-[var(--border)] rounded-lg py-2 px-2 text-xs text-[var(--text)] bg-[var(--bg)]"
                                    />
                                    <span className="text-[var(--muted)] text-sm">to</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => { setEndDate(e.target.value); setShowPreview(false); }}
                                        className="block w-full border border-[var(--border)] rounded-lg py-2 px-2 text-xs text-[var(--text)] bg-[var(--bg)]"
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
                                onClick={() => performGeneration(reportType)}
                                disabled={!canGenerate || isGenerating}
                                className={clsx(
                                    "w-full h-[48px] px-4 rounded-xl text-[15px] font-semibold transition-all duration-200 flex items-center justify-center gap-2",
                                    (canGenerate && !isGenerating)
                                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.2)]"
                                        : "bg-[var(--bg)] text-[var(--muted)] border border-[var(--border)] cursor-not-allowed"
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
                <div id="report-preview-section" className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-6">Report Preview</h2>

                    {(!showPreview || !canGenerate) ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-[var(--border)] rounded-xl bg-[var(--bg)]">
                            <div className="h-12 w-12 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] mb-4 shadow-inner">
                                <svg className="w-6 h-6 text-blue-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <p className="text-sm font-medium text-[var(--text)]">Your generated report preview will appear here.</p>
                            <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">Select your parameters above and click generate to begin.</p>
                        </div>
                    ) : reportData?.totalReceipts === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-amber-500/30 rounded-xl bg-amber-500/5">
                            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4 shadow-inner">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <p className="text-sm font-bold text-amber-500">No receipt data available for this time period</p>
                            <p className="text-xs text-[var(--muted)] mt-2 max-w-sm mx-auto">Try extending your date range to capture more transaction logging activity.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            
                            {/* Summary View Real Data */}
                            {reportType === "Summary Report" && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                                            <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Total Documented</p>
                                            <p className="text-2xl font-semibold text-[var(--text)] tabular-nums">{reportData.totalReceipts}</p>
                                        </div>
                                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                                            <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Total Taxes Found</p>
                                            <p className="text-2xl font-semibold text-amber-500 tabular-nums">${reportData.totalTax.toFixed(2)}</p>
                                        </div>
                                        <div className="col-span-2 lg:col-span-1 bg-blue-600 border border-[var(--border)] rounded-2xl p-5 shadow-sm relative overflow-hidden">
                                            <p className="text-[10px] font-bold text-white uppercase tracking-wider mb-2 relative z-10">Total Period Spend</p>
                                            <p className="text-2xl font-bold text-white relative z-10 tabular-nums">${reportData.totalSpend.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    {reportData.topCategories?.length > 0 && (
                                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm overflow-hidden">
                                            <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Leading Categories</h3>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-left text-sm">
                                                    <thead className="text-[11px] text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)]">
                                                        <tr>
                                                            <th className="font-medium px-4 py-3">Category</th>
                                                            <th className="font-medium px-4 py-3 text-right">Transactions</th>
                                                            <th className="font-medium px-4 py-3 text-right">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">
                                                        {reportData.topCategories.slice(0, 5).map((cat: any) => (
                                                            <tr key={cat.name} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                                <td className="px-4 py-4 flex items-center gap-3">
                                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></div> 
                                                                    {cat.name}
                                                                </td>
                                                                <td className="px-4 py-4 text-right text-[var(--muted)] tabular-nums">{cat.count}</td>
                                                                <td className="px-4 py-4 text-right font-medium tabular-nums">${cat.total.toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Category Breakdown (Pro Real Data) */}
                            {reportType === "Category Breakdown" && (
                                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm overflow-hidden">
                                    <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Detailed Expenditure Matrix</h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-left text-sm">
                                            <thead className="text-[11px] text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)]">
                                                <tr>
                                                    <th className="font-medium px-4 py-3">Category Map</th>
                                                    <th className="font-medium px-4 py-3 text-right">Transactions</th>
                                                    <th className="font-medium px-4 py-3 text-right">% of Output</th>
                                                    <th className="font-medium px-4 py-3 text-right">Total Aggregate</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">
                                                {reportData.topCategories.map((cat: any) => {
                                                    const percent = reportData.totalSpend > 0 ? (cat.total / reportData.totalSpend) * 100 : 0;
                                                    return (
                                                        <tr key={cat.name} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                            <td className="px-4 py-4 font-medium" style={{ color: cat.color }}>{cat.name}</td>
                                                            <td className="px-4 py-4 text-right text-[var(--muted)] tabular-nums">{cat.count}</td>
                                                            <td className="px-4 py-4 text-right tabular-nums">{percent.toFixed(1)}%</td>
                                                            <td className="px-4 py-4 text-right font-medium tabular-nums">${cat.total.toFixed(2)}</td>
                                                        </tr>
                                                    );
                                                })}
                                                <tr className="bg-black/5 dark:bg-white/5 border-t-2 border-[var(--border)]">
                                                    <td className="px-4 py-4 font-bold text-[var(--text)]">Total Database Load</td>
                                                    <td className="px-4 py-4 text-right tabular-nums font-bold">{reportData.totalReceipts}</td>
                                                    <td className="px-4 py-4 text-right tabular-nums">100%</td>
                                                    <td className="px-4 py-4 text-right font-bold text-[var(--text)] tabular-nums">${reportData.totalSpend.toFixed(2)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Bundle Report (Pro Real Data) */}
                            {reportType === "Bundle Report" && (
                                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm overflow-hidden">
                                    <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Tax Event Bundle Separation</h3>
                                    {reportData.topBundles?.length === 0 ? (
                                        <p className="text-sm text-[var(--muted)] text-center py-8">No receipts in this date range are attached to bundles.</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-left text-sm whitespace-nowrap">
                                                <thead className="text-[11px] text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)]">
                                                    <tr>
                                                        <th className="font-medium px-4 py-3">Bundle Container</th>
                                                        <th className="font-medium px-4 py-3 text-right">Child Assets</th>
                                                        <th className="font-medium px-4 py-3 text-right">Total Aggregate</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">
                                                    {reportData.topBundles.map((bun: any) => (
                                                        <tr key={bun.name} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                            <td className="px-4 py-4 flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                                </div>
                                                                {bun.name}
                                                            </td>
                                                            <td className="px-4 py-4 text-right text-[var(--muted)] tabular-nums">{bun.count} Receipts</td>
                                                            <td className="px-4 py-4 text-right font-medium tabular-nums">${bun.total.toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* OCR Detail Report (Pro Real Data) */}
                            {reportType === "OCR Detail Report" && (
                                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm overflow-hidden">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                        <h3 className="text-sm font-semibold text-[var(--text)]">Raw AI OCR Extraction Grid</h3>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input type="checkbox" className="sr-only" checked={showRawOcr} onChange={(e) => setShowRawOcr(e.target.checked)} />
                                                <div className={`block w-9 h-5 rounded-full transition-colors ${showRawOcr ? 'bg-blue-600' : 'bg-[var(--border)]'}`}></div>
                                                <div className={`absolute left-0.5 top-0.5 bg-[var(--card)] border border-[var(--border)] w-4 h-4 rounded-full transition-transform shadow-sm ${showRawOcr ? 'transform translate-x-4' : ''}`}></div>
                                            </div>
                                            <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--muted)] group-hover:text-[var(--text)] transition-colors select-none">Show JSON Output</span>
                                        </label>
                                    </div>

                                    {reportData.ocrDetails?.length === 0 ? (
                                        <p className="text-sm text-[var(--muted)] text-center py-8">No AI OCR logs found in this date range.</p>
                                    ) : showRawOcr ? (
                                        <div className="bg-black/90 rounded-xl p-4 overflow-auto border border-[var(--border)] max-h-[300px] custom-scrollbar">
                                            <pre className="text-xs text-blue-300 font-mono leading-relaxed">
                                                {JSON.stringify(reportData.ocrDetails, null, 2)}
                                            </pre>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-left text-sm whitespace-nowrap">
                                                <thead className="text-[11px] uppercase tracking-widest text-[var(--muted)] border-b border-[var(--border)]">
                                                    <tr>
                                                        <th className="font-medium px-4 py-3">Vendor</th>
                                                        <th className="font-medium px-4 py-3">Date</th>
                                                        <th className="font-medium px-4 py-3 text-right">Subtotal</th>
                                                        <th className="font-medium px-4 py-3 text-right">Tax</th>
                                                        <th className="font-medium px-4 py-3 text-right">Total</th>
                                                        <th className="font-medium px-4 py-3 text-right">Confidence</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--border)] text-[var(--text)] font-mono text-xs">
                                                    {reportData.ocrDetails.map((ocr: any) => (
                                                        <tr key={ocr.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                            <td className="px-4 py-3 font-sans truncate max-w-[150px]">{ocr.vendor}</td>
                                                            <td className="px-4 py-3 text-[var(--muted)]">{ocr.date}</td>
                                                            <td className="px-4 py-3 text-right tabular-nums">${ocr.subtotal.toFixed(2)}</td>
                                                            <td className="px-4 py-3 text-right text-[var(--muted)] tabular-nums">${ocr.tax.toFixed(2)}</td>
                                                            <td className="px-4 py-3 text-right font-bold tabular-nums">${ocr.total.toFixed(2)}</td>
                                                            <td className={`px-4 py-3 text-right font-bold tabular-nums ${ocr.confidence >= 0.9 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                                {ocr.confidence ? (ocr.confidence * 100).toFixed(1) + '%' : 'N/A'}
                                                            </td>
                                                        </tr>
                                                    ))}
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
                                    <button className="flex-1 md:flex-none px-4 py-2 border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text)] bg-[var(--bg)] rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2">
                                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        Export CSV
                                    </button>

                                    {isPro ? (
                                        <>
                                            <button className="flex-1 md:flex-none px-4 py-2 border border-blue-500/30 hover:bg-blue-500/10 text-blue-500 bg-blue-500/5 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2 shadow-sm">
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
                                            <button disabled className="group relative flex-1 md:flex-none px-4 py-2 border border-[var(--border)] text-[var(--muted)]/50 bg-black/5 dark:bg-white/5 rounded-xl text-sm font-medium flex justify-center items-center gap-2 cursor-not-allowed">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Export PDF
                                            </button>
                                            <button disabled className="group relative flex-1 md:flex-none px-4 py-2 border border-[var(--border)] text-[var(--muted)]/50 bg-black/5 dark:bg-white/5 rounded-xl text-sm font-medium flex justify-center items-center gap-2 cursor-not-allowed">
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
                            onClick={() => performGeneration("Summary Report")}
                            className="p-6 flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--card)] cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                        >
                            <div className="mt-0.5 shrink-0 text-blue-500 bg-blue-500/10 p-3 rounded-full">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012-2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text)] group-hover:text-blue-500 transition-colors">Summary Report</h3>
                                <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">Overview of receipt totals and activity.</p>
                            </div>
                        </div>

                        <div
                            onClick={() => performGeneration("Category Breakdown")}
                            className="p-6 flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--card)] cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
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
                            onClick={() => performGeneration("Bundle Report")}
                            className="p-6 flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--card)] cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                        >
                            <div className="mt-0.5 shrink-0 text-emerald-500 bg-emerald-500/10 p-3 rounded-full">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text)] group-hover:text-emerald-500 transition-colors flex items-center gap-2">
                                    Bundle Report
                                    {!isPro && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">🔒 Pro</span>}
                                </h3>
                                <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">View totals grouped by project bundles.</p>
                            </div>
                        </div>

                        <div
                            onClick={() => performGeneration("OCR Detail Report")}
                            className="p-6 flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--card)] cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group"
                        >
                            <div className="mt-0.5 shrink-0 text-purple-500 bg-purple-500/10 p-3 rounded-full">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text)] group-hover:text-purple-500 transition-colors flex items-center gap-2">
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
