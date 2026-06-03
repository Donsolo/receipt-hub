import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
"use client";

import React, { useEffect, useState } from 'react';
import LensAnnotationCanvas from '@/components/vero-lens/LensAnnotationCanvas';
import SignaturePad from '@/components/vero-lens/SignaturePad';
import { format } from 'date-fns';

export default function QuoteClient({ token }: { token: string }) {
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [actionState, setActionState] = useState<'idle' | 'approving' | 'rejecting' | 'revising'>('idle');
    const [customerName, setCustomerName] = useState('');
    const [message, setMessage] = useState('');
    const [signatureData, setSignatureData] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchQuote = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/public/lens/quote/${token}`, { headers: { ...((await getAuthHeader()) as any) } });
                if (!res.ok) {
                    const text = await res.text();
                    setError(text);
                } else {
                    const data = await res.json();
                    setQuote(data);
                }
            } catch (err) {
                setError("Failed to load quote.");
            } finally {
                setLoading(false);
            }
        };
        fetchQuote();
    }, [token]);

    const handleAction = async (actionType: 'approve' | 'reject' | 'revision') => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/public/lens/quote/${token}/action`, {
                method: 'POST',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: actionType,
                    customerName,
                    message,
                    signatureDataUrl: signatureData
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (actionType === 'revision') {
                    alert('Your revision request has been sent to the business owner.');
                    setMessage('');
                    setActionState('idle');
                } else {
                    setQuote({
                        ...quote,
                        share: {
                            ...quote.share,
                            status: data.status,
                            approvedAt: data.status === 'APPROVED' ? new Date() : null,
                            rejectedAt: data.status === 'REJECTED' ? new Date() : null
                        }
                    });
                    setActionState('idle');
                }
            } else {
                const errText = await res.text();
                alert(errText);
            }
        } catch (err) {
            alert("An error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error || !quote) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{error || "Quote Unavailable"}</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        This link is no longer valid or has expired. Please contact the business for a new link.
                    </p>
                </div>
            </div>
        );
    }

    const business = quote.business;
    const share = quote.share;
    const isProcessed = share.approvedAt || share.rejectedAt;

    const totalHigh = quote.lineItems.reduce((acc: number, item: any) => acc + (item.quantity * (item.unitPrice || item.estimatedPriceHigh || 0)), 0);
    const totalLow = quote.lineItems.reduce((acc: number, item: any) => acc + (item.quantity * (item.unitPrice || item.estimatedPriceLow || 0)), 0);
    const hasRanges = quote.lineItems.some((i: any) => !i.unitPrice && i.estimatedPriceHigh);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-sans selection:bg-indigo-500/30 pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center text-center">
                {business?.businessLogoPath && (
                    <img src={business.businessLogoPath} alt="Logo" className="h-12 w-auto object-contain mb-4" />
                )}
                <h1 className="text-2xl font-bold">{business?.businessName || business?.name || 'Service Estimate'}</h1>
                {business?.businessPhone && <p className="text-gray-500 text-sm mt-1">{business.businessPhone}</p>}
                
                <div className="mt-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300">
                    <span>Quote #{quote.id.substring(0,8).toUpperCase()}</span>
                    <span>•</span>
                    <span>{format(new Date(quote.createdAt), 'MMM d, yyyy')}</span>
                </div>
                {quote.version && (
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        Version {quote.version.versionNumber}
                    </div>
                )}
            </div>

            <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
                
                {/* Status Banner */}
                {isProcessed && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 ${share.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' : 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'}`}>
                        {share.status === 'APPROVED' ? (
                            <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                            <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        )}
                        <div>
                            <h3 className="font-bold">Quote {share.status === 'APPROVED' ? 'Approved' : 'Declined'}</h3>
                            <p className="text-sm opacity-80">This quote was {share.status === 'APPROVED' ? 'approved' : 'declined'} on {format(new Date(share.approvedAt || share.rejectedAt), 'MMM d, yyyy')}.</p>
                        </div>
                    </div>
                )}

                {/* Scope & Details */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-end">
                        <div>
                            <h2 className="text-xl font-bold">{quote.title || 'Estimated Scope of Work'}</h2>
                            {quote.serviceCategory && <p className="text-sm text-gray-500 uppercase tracking-wider mt-1">{quote.serviceCategory.replace('_', ' ')}</p>}
                            {quote.version?.changeSummary && (
                                <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-sm border border-blue-100 dark:border-blue-800/50">
                                    <strong>Revision Notes:</strong> {quote.version.changeSummary}
                                </div>
                            )}
                        </div>
                        <a href={`/api/public/lens/quote/${token}/pdf`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-500 text-sm font-bold flex items-center gap-1 shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download PDF
                        </a>
                    </div>

                    <div className="p-6 overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead>
                                <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                                    <th className="pb-3 pr-4">Description</th>
                                    <th className="pb-3 px-4 text-center">Qty</th>
                                    <th className="pb-3 px-4 text-right">Unit Price</th>
                                    <th className="pb-3 pl-4 text-right">Estimated Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {quote.lineItems.map((item: any) => (
                                    <tr key={item.id}>
                                        <td className="py-4 pr-4">
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                                            {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
                                        </td>
                                        <td className="py-4 px-4 text-center tabular-nums text-gray-600 dark:text-gray-400">
                                            {item.quantity} {item.unit || ''}
                                        </td>
                                        <td className="py-4 px-4 text-right tabular-nums text-gray-600 dark:text-gray-400">
                                            {item.unitPrice ? `$${Number(item.unitPrice).toFixed(2)}` : 'TBD'}
                                        </td>
                                        <td className="py-4 pl-4 text-right font-medium tabular-nums">
                                            {item.unitPrice 
                                                ? `$${Number(item.quantity * item.unitPrice).toFixed(2)}`
                                                : (item.estimatedPriceHigh ? `$${Number(item.estimatedPriceLow).toFixed(2)} - $${Number(item.estimatedPriceHigh).toFixed(2)}` : 'TBD')
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3} className="py-4 pr-4 text-right font-bold text-lg">Estimated Total:</td>
                                    <td className="py-4 pl-4 text-right font-bold text-xl text-indigo-600 dark:text-indigo-400 tabular-nums">
                                        {hasRanges ? `$${totalLow.toFixed(2)} - $${totalHigh.toFixed(2)}` : `$${totalHigh.toFixed(2)}`}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Annotated Images */}
                {quote.images && quote.images.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-bold mb-4">Visual References</h2>
                        
                        {quote.images.length > 1 && (
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                {quote.images.map((img: any, idx: number) => (
                                    <button 
                                        key={img.id}
                                        onClick={() => setActiveImageIndex(idx)}
                                        className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${activeImageIndex === idx ? 'border-indigo-600' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    >
                                        <img src={img.imageUrl} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="w-full max-w-2xl mx-auto rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            <LensAnnotationCanvas 
                                imageId={quote.images[activeImageIndex].id}
                                imageUrl={quote.images[activeImageIndex].imageUrl}
                                initialAnnotations={typeof quote.images[activeImageIndex].annotations === 'string' ? JSON.parse(quote.images[activeImageIndex].annotations || '[]') : (quote.images[activeImageIndex].annotations || [])}
                                readOnly={true}
                            />
                        </div>
                    </div>
                )}

                {quote.disclaimer && (
                    <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-xl text-sm text-gray-600 dark:text-gray-400">
                        <strong>Disclaimer:</strong> {quote.disclaimer}
                    </div>
                )}

                {/* Version History */}
                {quote.history && quote.history.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-bold mb-4">Version History</h2>
                        <div className="space-y-4">
                            {quote.history.map((v: any, index: number) => (
                                <div key={index} className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">Version {v.versionNumber}</span>
                                            {quote.version?.versionNumber === v.versionNumber && (
                                                <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Current</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{v.changeSummary}</p>
                                    </div>
                                    <span className="text-xs text-gray-400 shrink-0">{format(new Date(v.createdAt), 'MMM d, yyyy')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Approval Actions */}
                {!isProcessed && share.allowApproval && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-indigo-200 dark:border-indigo-500/30 p-6">
                        {actionState === 'idle' && (
                            <div className="text-center space-y-6">
                                <h2 className="text-xl font-bold">Ready to proceed?</h2>
                                <p className="text-gray-500">Review the estimate above and choose an option.</p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <button 
                                        onClick={() => setActionState('rejecting')}
                                        className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Decline Estimate
                                    </button>
                                    <button 
                                        onClick={() => setActionState('revising')}
                                        className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Request Revision
                                    </button>
                                    <button 
                                        onClick={() => setActionState('approving')}
                                        className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 shadow-md transition-colors"
                                    >
                                        Approve Estimate
                                    </button>
                                </div>
                            </div>
                        )}

                        {actionState === 'approving' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 border-b border-gray-100 dark:border-gray-700 pb-4">Approve Estimate</h2>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-1">Your Name</label>
                                    <input 
                                        type="text" 
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                {share.allowSignature && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Signature</label>
                                        <p className="text-xs text-gray-500 mb-2">Please sign in the box below to approve this estimate.</p>
                                        {!signatureData ? (
                                            <SignaturePad 
                                                onSave={setSignatureData} 
                                                onCancel={() => setActionState('idle')} 
                                            />
                                        ) : (
                                            <div className="relative border-2 border-emerald-500 rounded-xl overflow-hidden bg-white h-[200px] flex items-center justify-center group">
                                                <img src={signatureData} alt="Signature" className="h-full object-contain" />
                                                <button 
                                                    onClick={() => setSignatureData(null)}
                                                    className="absolute inset-0 bg-black/50 text-white font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    Tap to Resign
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={() => { setActionState('idle'); setSignatureData(null); }}
                                        className="flex-1 px-4 py-3 rounded-xl border border-gray-300 font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        disabled={isSubmitting || !customerName || (share.allowSignature && !signatureData)}
                                        onClick={() => handleAction('approve')}
                                        className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Submit Approval'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {actionState === 'rejecting' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                <h2 className="text-xl font-bold text-red-600 border-b border-gray-100 dark:border-gray-700 pb-4">Decline Estimate</h2>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-1">Your Name</label>
                                    <input 
                                        type="text" 
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-red-500"
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
                                    <textarea 
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-red-500 min-h-[100px]"
                                        placeholder="Please let us know why you are declining this estimate."
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={() => setActionState('idle')}
                                        className="flex-1 px-4 py-3 rounded-xl border border-gray-300 font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        disabled={isSubmitting || !customerName}
                                        onClick={() => handleAction('reject')}
                                        className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Submit Decline'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {actionState === 'revising' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                <h2 className="text-xl font-bold text-orange-600 dark:text-orange-500 border-b border-gray-100 dark:border-gray-700 pb-4">Request a Revision</h2>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-1">Your Name</label>
                                    <input 
                                        type="text" 
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-orange-500"
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">What needs adjustment?</label>
                                    <textarea 
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-orange-500 min-h-[100px]"
                                        placeholder="Tell the business owner what needs adjustment..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={() => setActionState('idle')}
                                        className="flex-1 px-4 py-3 rounded-xl border border-gray-300 font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        disabled={isSubmitting || !customerName || !message.trim()}
                                        onClick={() => handleAction('revision')}
                                        className="flex-1 px-4 py-3 rounded-xl bg-orange-600 text-white font-bold disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Sending...' : 'Send Request'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
