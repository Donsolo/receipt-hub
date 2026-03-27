"use client";

import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { clsx } from 'clsx';

interface PublicInvoice {
    id: string;
    clientName: string;
    clientEmail: string | null;
    clientCompany: string | null;
    clientPhone: string | null;
    clientAddress: string | null;
    clientPropertyAddress: string | null;
    title: string;
    description: string | null;
    currency: string;
    subtotal: number;
    tax: number;
    total: number;
    issueDate: string;
    dueDate: string | null;
    notes: string | null;
    status: string;
    isConverted: boolean;
    paymentConfirmed: boolean;
    paymentConfirmedAt: string | null;
    createdAt: string;
    items: {
        id: string;
        name: string;
        description: string | null;
        quantity: number;
        unitPrice: number;
        total: number;
    }[];
}

export default function PublicInvoiceViewer({ token }: { token: string }) {
    const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Auth Signature States
    const [signatureType, setSignatureType] = useState<'draw' | 'type'>('draw');
    const [signatureText, setSignatureText] = useState('');
    const [signatureBase64, setSignatureBase64] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [isConfirmedLocal, setIsConfirmedLocal] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const res = await fetch(`/api/public/invoice/${token}`);
                const data = await res.json();
                
                if (!res.ok || !data.success) {
                    throw new Error(data.error || 'Failed to open invoice. The link may be invalid.');
                }
                
                setInvoice(data.invoice);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvoice();
    }, [token]);

    const formatCurrency = (amount: number, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    // Canvas Logic
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (signatureType !== 'draw') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.strokeStyle = '#3b82f6'; // blue-500 ink
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // High DPI mapping
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * (window.devicePixelRatio || 1);
        canvas.height = rect.height * (window.devicePixelRatio || 1);
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }, [signatureType, invoice]);

    const startDrawing = (e: any) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.nativeEvent.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.nativeEvent.clientY;

        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
        setIsDrawing(true);
    };

    const draw = (e: any) => {
        if (!isDrawing) return;
        // e.preventDefault();
        
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.nativeEvent.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.nativeEvent.clientY;

        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (canvasRef.current) {
            setSignatureBase64(canvasRef.current.toDataURL('image/png'));
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureBase64('');
    };

    const handleConfirmPayment = async () => {
        const finalSignature = signatureType === 'draw' ? signatureBase64 : signatureText;
        if (!finalSignature || finalSignature.trim() === '') {
            alert('Please provide a signature or initials to confirm.');
            return;
        }

        setIsConfirming(true);
        try {
            const res = await fetch(`/api/public/invoice/${token}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signature: finalSignature,
                    isInitials: signatureType === 'type'
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to confirm payment');

            setIsConfirmedLocal(true);
            setInvoice(prev => prev ? { ...prev, status: 'PAID', paymentConfirmed: true } : prev);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsConfirming(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col pt-8 sm:pt-16 pb-24 px-4 sm:px-6 animate-pulse">
                <div className="bg-white dark:bg-[var(--card)] rounded-3xl shadow-xl overflow-hidden flex flex-col relative ring-1 ring-black/5 dark:ring-white/5">
                    <div className="px-6 py-8 sm:p-10 border-b border-gray-100 dark:border-[var(--border)] bg-gray-50/50 dark:bg-black/20 flex flex-col sm:flex-row justify-between gap-6">
                        <div className="space-y-4 w-full max-w-sm">
                            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-full w-32"></div>
                            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg w-full"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                        </div>
                        <div className="space-y-3 w-full sm:w-48 text-right">
                            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-16 ml-auto"></div>
                            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                        </div>
                    </div>
                    <div className="px-6 py-6 sm:px-10 grid grid-cols-2 md:grid-cols-4 gap-6 bg-white dark:bg-transparent border-b border-gray-100 dark:border-[var(--border)]">
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
                    </div>
                    <div className="px-6 py-8 sm:px-10 flex-1 bg-white dark:bg-transparent min-h-[300px]">
                        <div className="space-y-6">
                            <div className="h-12 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full"></div>
                            <div className="h-12 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full"></div>
                            <div className="h-12 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-inner ring-1 ring-red-500/20">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h1 className="text-xl font-bold text-[var(--text)] mb-3">Link Invalid or Expired</h1>
                <p className="text-sm text-[var(--muted)] mb-8 leading-relaxed">
                    {error || 'This secure invoice link is no longer active. Please request a new link from the sender.'}
                </p>
            </div>
        );
    }

    const isPaid = invoice.status === 'PAID';

    return (
        <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col pt-4 sm:pt-8 bg-gray-50/50 dark:bg-[#0b1220] print:bg-white print:dark:bg-white">
            
            {/* Print Toolbar */}
            <div className="w-full flex justify-end items-center gap-3 px-4 sm:px-6 mb-4 print:hidden">
                <a 
                    href={`/api/public/invoice/${token}/pdf`}
                    download
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-sm font-bold rounded-xl shadow-sm transition-all"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download PDF
                </a>
                <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[var(--card)] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-[var(--text)] text-sm font-bold rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-all"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Print
                </button>
            </div>

            <div className="flex-1 w-full flex flex-col pb-24 px-4 sm:px-6 print:p-0 print:m-0 print:block">
            
            {/* Main Premium Card */}
            <div className="bg-white dark:bg-[var(--card)] rounded-3xl shadow-2xl shadow-indigo-500/5 ring-1 ring-black/5 dark:ring-white/5 overflow-hidden flex flex-col relative z-10 transition-all duration-500 print:shadow-none print:ring-0 print:rounded-none">
                
                {/* Header Strip */}
                <div className="px-6 py-8 sm:p-10 border-b border-gray-100 dark:border-[var(--border)] relative overflow-hidden bg-gray-50/50 dark:bg-black/20 print:bg-transparent print:border-gray-200">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
                        <div>
                            <span className={clsx(
                                "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4",
                                isPaid ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20" : "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20"
                            )}>
                                {isPaid ? 'Payment Complete' : 'Pending Payment'}
                            </span>
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
                                {invoice.title}
                            </h1>
                            {invoice.description && (
                                <p className="text-sm text-gray-500 dark:text-[var(--muted)] mt-2 max-w-md line-clamp-2">
                                    {invoice.description}
                                </p>
                            )}
                        </div>

                        <div className="text-left sm:text-right w-full sm:w-auto p-4 sm:p-0 bg-white dark:bg-transparent rounded-xl ring-1 ring-black/5 sm:ring-0 dark:ring-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-[var(--muted)] mb-2">Billed To</p>
                            
                            {invoice.clientCompany && <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">{invoice.clientCompany}</p>}
                            <p className={clsx("font-extrabold text-gray-900 dark:text-white", invoice.clientCompany ? "text-sm text-gray-600 dark:text-[var(--muted)] mt-0.5 font-medium" : "text-base sm:text-lg")}>{invoice.clientName}</p>
                            
                            {(invoice.clientEmail || invoice.clientPhone) && (
                                <div className="mt-1 space-y-0.5 text-left sm:text-right">
                                    {invoice.clientEmail && <p className="text-sm text-gray-500 dark:text-[var(--muted)]">{invoice.clientEmail}</p>}
                                    {invoice.clientPhone && <p className="text-sm text-gray-500 dark:text-[var(--muted)]">{invoice.clientPhone}</p>}
                                </div>
                            )}

                            {invoice.clientAddress && <pre className="text-sm text-gray-500 dark:text-[var(--muted)] font-sans mt-2 whitespace-pre-wrap leading-relaxed text-left sm:text-right">{invoice.clientAddress}</pre>}
                            
                            {/* Property Addr */}
                            {invoice.clientPropertyAddress && (
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[var(--border)]/50 text-left sm:text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[var(--muted)] mb-1">Service Address</p>
                                    <pre className="text-sm text-gray-500 dark:text-[var(--muted)] font-sans whitespace-pre-wrap leading-relaxed text-left sm:text-right">{invoice.clientPropertyAddress}</pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dates & Reference Block */}
                <div className="px-6 py-6 sm:px-10 grid grid-cols-2 md:grid-cols-4 gap-6 bg-white dark:bg-transparent border-b border-gray-100 dark:border-[var(--border)] print:border-gray-200">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[var(--muted)] print:text-gray-500 mb-1">Date Issued</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white print:text-black">{format(new Date(invoice.issueDate), 'MMM d, yyyy')}</p>
                    </div>
                    {invoice.dueDate && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[var(--muted)] mb-1">Due Date</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[var(--muted)] mb-1">Invoice ID</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-widest">{invoice.id.split('-')[0].slice(0, 8)}</p>
                    </div>
                </div>

                {/* Line Items Table */}
                <div className="px-6 py-8 sm:px-10 flex-1 bg-white dark:bg-transparent">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-100 dark:border-[var(--border)]">
                                    <th className="py-3 text-xs font-bold text-gray-500 dark:text-[var(--muted)] uppercase tracking-wider">Description</th>
                                    <th className="py-3 text-xs font-bold text-gray-500 dark:text-[var(--muted)] uppercase tracking-wider text-center w-24">Qty</th>
                                    <th className="py-3 text-xs font-bold text-gray-500 dark:text-[var(--muted)] uppercase tracking-wider text-right w-32">Price</th>
                                    <th className="py-3 text-xs font-bold text-gray-500 dark:text-[var(--muted)] uppercase tracking-wider text-right w-32">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-[var(--border)]/50 print:divide-gray-200">
                                {invoice.items.map((item) => (
                                    <tr key={item.id} className="group print:break-inside-avoid">
                                        <td className="py-5">
                                            <div className="font-semibold text-gray-900 dark:text-[var(--text)] print:text-black">{item.name}</div>
                                            {item.description && <div className="text-xs text-gray-500 dark:text-[var(--muted)] print:text-gray-600 mt-1">{item.description}</div>}
                                        </td>
                                        <td className="py-5 text-center text-sm font-medium text-gray-700 dark:text-[var(--text)] print:text-gray-800">{item.quantity}</td>
                                        <td className="py-5 text-right text-sm font-medium text-gray-700 dark:text-[var(--text)] print:text-gray-800">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                                        <td className="py-5 text-right font-bold text-gray-900 dark:text-[var(--text)] print:text-black">{formatCurrency(item.total, invoice.currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Math Block */}
                    <div className="mt-8 flex justify-end print:break-inside-avoid">
                        <div className="w-full sm:w-80 bg-gray-50 dark:bg-black/20 rounded-2xl p-6 ring-1 ring-black/5 dark:ring-white/5 print:bg-transparent print:ring-0 print:border-t print:border-gray-200 print:rounded-none">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm text-gray-500 dark:text-[var(--muted)] font-medium print:text-gray-600">Subtotal</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums print:text-black">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 dark:border-[var(--border)]">
                                <span className="text-sm text-gray-500 dark:text-[var(--muted)] font-medium">Tax</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{formatCurrency(invoice.tax, invoice.currency)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-base font-bold text-gray-900 dark:text-white">Total Due</span>
                                <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums tracking-tight">
                                    {formatCurrency(invoice.total, invoice.currency)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {invoice.notes && (
                        <div className="mt-10 pt-6 border-t border-gray-100 dark:border-[var(--border)]">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-[var(--muted)] mb-2">Additional Notes</p>
                            <p className="text-sm text-gray-600 dark:text-[var(--muted)] whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer Action Section */}
                <div className="bg-gray-50 dark:bg-[#0b1220] px-6 py-8 sm:p-10 border-t border-gray-200 dark:border-[var(--border)] relative overflow-hidden print:hidden">
                    {/* Success Conditionals */}
                    {isPaid || invoice.paymentConfirmed || isConfirmedLocal ? (
                        <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-4 ring-1 ring-emerald-500/20">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Confirmed ✅</h3>
                            <p className="text-sm text-gray-500 dark:text-[var(--muted)] max-w-sm">
                                This transaction has been officially settled and converted into an audit-ready receipt by the issuer.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col xl:flex-row items-start justify-between gap-8 animate-in fade-in pb-4">
                            
                            <div className="flex-1 w-full max-w-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-[var(--muted)]">Client Authorization</p>
                                    <div className="flex bg-white dark:bg-black/20 p-1 rounded-lg ring-1 ring-black/5 dark:ring-white/5">
                                        <button onClick={() => setSignatureType('draw')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${signatureType === 'draw' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'text-gray-500 dark:text-[var(--muted)] hover:text-gray-900 dark:hover:text-white'}`}>Draw</button>
                                        <button onClick={() => setSignatureType('type')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${signatureType === 'type' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'text-gray-500 dark:text-[var(--muted)] hover:text-gray-900 dark:hover:text-white'}`}>Type</button>
                                    </div>
                                </div>
                                
                                {signatureType === 'draw' ? (
                                    <div className="relative w-full h-32 bg-white dark:bg-[#0f172a] border-2 border-dashed border-gray-300 dark:border-gray-700/50 rounded-xl overflow-hidden group">
                                        <canvas
                                            ref={canvasRef}
                                            className="w-full h-full cursor-crosshair touch-none"
                                            onMouseDown={startDrawing}
                                            onMouseMove={draw}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                            onTouchStart={startDrawing}
                                            onTouchMove={draw}
                                            onTouchEnd={stopDrawing}
                                        />
                                        <button onClick={clearCanvas} className="absolute top-2 right-2 text-[10px] uppercase tracking-wider font-bold text-gray-400 hover:text-gray-600 dark:hover:text-white px-2 py-1 bg-gray-100 dark:bg-white/5 rounded opacity-0 group-hover:opacity-100 transition-opacity">Clear</button>
                                        {!signatureBase64 && !isDrawing && <p className="absolute inset-0 pointer-events-none flex items-center justify-center text-sm font-medium text-gray-300 dark:text-gray-600 italic">Sign here</p>}
                                    </div>
                                ) : (
                                    <div className="w-full relative">
                                        <input 
                                            type="text" 
                                            placeholder="Type your full name or initials..."
                                            value={signatureText}
                                            onChange={(e) => setSignatureText(e.target.value)}
                                            className="w-full h-16 px-4 bg-white dark:bg-[#0f172a] border-2 border-transparent focus:border-blue-500 rounded-xl ring-1 ring-gray-200 dark:ring-gray-800 text-lg font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition-all"
                                            style={{ fontFamily: "'Caveat', 'Dancing Script', cursive, sans-serif" }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="w-full xl:w-auto shrink-0 flex flex-col items-center xl:items-end mt-4 xl:mt-8">
                                <button 
                                    disabled={isConfirming || isConfirmedLocal || (signatureType === 'draw' ? !signatureBase64 : !signatureText)}
                                    onClick={handleConfirmPayment}
                                    className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3 disabled:transform-none ${isConfirmedLocal ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                                >
                                    {isConfirmedLocal ? 'Payment Confirmed ✅' : isConfirming ? 'Processing...' : 'Confirm Payment'}
                                    {!isConfirming && !isConfirmedLocal && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                                </button>
                                <p className="text-xs text-gray-500 dark:text-[var(--muted)] mt-4 font-medium max-w-[280px] text-center xl:text-right">
                                    By confirming, you authorize and legally agree to remit exactly <br/><strong className="text-gray-900 dark:text-gray-300">{formatCurrency(invoice.total, invoice.currency)}</strong> to the issuer.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Verihub CTA (Watermark Footer) */}
            <div className="mt-16 flex flex-col items-center justify-center text-center pb-8 transition-all duration-500 print:hidden">
                <div className="flex flex-col items-center gap-4 bg-white/60 dark:bg-black/20 p-8 rounded-3xl ring-1 ring-black/5 dark:ring-white/5 backdrop-blur-md max-w-sm w-full shadow-lg shadow-black/5">
                    <img src="/assets/text-logo.png" alt="Verihub" className="h-6 w-auto dark:invert mb-1" />
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Start using Verihub</h4>
                    <p className="text-sm text-gray-500 dark:text-[var(--muted)] font-medium px-4">Create, track, and get paid with secure professional invoices.</p>
                    <Link href="/register" className="w-full mt-4 px-6 py-3.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5">
                        Create your own invoices
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </Link>
                </div>
            </div>

            </div>
        </div>
    );
}
