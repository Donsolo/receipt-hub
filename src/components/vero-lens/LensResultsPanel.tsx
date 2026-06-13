"use client";
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import { useState } from "react";
import { clsx } from "clsx";
import { useRouter } from 'next/navigation';
import LensAnnotationCanvas from './LensAnnotationCanvas';
import { format } from 'date-fns';

export default function LensResultsPanel({ session, onLineItemUpdate }: { session: any, onLineItemUpdate: () => void }) {
    const router = useRouter();
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showReAnalyzeModal, setShowReAnalyzeModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [isReAnalyzing, setIsReAnalyzing] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [isReminding, setIsReminding] = useState(false);
    
    // Versioning
    const [showVersionModal, setShowVersionModal] = useState(false);
    const [isVersioning, setIsVersioning] = useState(false);
    const [versionSummary, setVersionSummary] = useState('');

    const latestImage = session.images?.[session.images?.length - 1];
    const activeShare = session.shares?.[0];

    const handleEditClick = (item: any) => {
        setEditingItemId(item.id);
        setEditForm({ ...item });
    };

    const handleSaveEdit = async () => {
        try {
            await fetch(`${API_BASE_URL}/api/vero/lens/sessions/${session.id}/line-items/${editingItemId}`, {
                method: 'PATCH',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editForm.title,
                    description: editForm.description,
                    quantity: parseFloat(editForm.quantity),
                    unit: editForm.unit,
                    estimatedPriceLow: parseFloat(editForm.estimatedPriceLow),
                    estimatedPriceHigh: parseFloat(editForm.estimatedPriceHigh)
                })
            });
            setEditingItemId(null);
            onLineItemUpdate();
        } catch (error) {
            console.error("Failed to save edit", error);
        }
    };

    const handleQuestionAnswer = async (qId: string, answer: string) => {
        try {
            await fetch(`${API_BASE_URL}/api/vero/lens/sessions/${session.id}/questions/${qId}`, {
                method: 'PATCH',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify({ answer })
            });
        } catch (error) {
            console.error("Failed to save answer", error);
        }
    };

    const handleSaveDraft = async () => {
        if (!session.lineItems || session.lineItems.length === 0) {
            alert("Cannot save a draft with zero line items. Please add at least one item.");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/vero/lens/sessions/${session.id}`, {
                method: 'PATCH',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'SAVED' })
            });
            if (res.ok) {
                alert("Draft saved successfully!");
                onLineItemUpdate(); // Refresh to reflect SAVED status
            } else {
                alert("Failed to save draft.");
            }
        } catch (error) {
            console.error("Error saving draft", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReAnalyze = async () => {
        setIsReAnalyzing(true);
        try {
            const analyzeRes = await fetch(`${API_BASE_URL}/api/vero/lens/sessions/${session.id}/analyze`, {
                method: 'POST',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tradeMode: session.tradeMode,
                    usePricingPreset: true 
                })
            });
            
            if (analyzeRes.ok) {
                onLineItemUpdate();
                setShowReAnalyzeModal(false);
            } else {
                alert("Analysis failed.");
            }
        } catch (err) {
            console.error(err);
            alert("Analysis failed.");
        } finally {
            setIsReAnalyzing(false);
        }
    };

    const handleConvert = async () => {
        setIsConverting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/vero/lens/sessions/${session.id}/convert-to-invoice`, {
                method: 'POST',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                const data = await res.json();
                router.push(`/dashboard/invoices/${data.invoiceId}`);
            } else {
                alert("Failed to convert to invoice.");
            }
        } catch (error) {
            console.error("Error converting to invoice", error);
        } finally {
            setIsConverting(false);
            setShowConfirmModal(false);
        }
    };

    const handleCreateShare = async () => {
        setIsSharing(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/vero/lens/sessions/${session.id}/share`, {
                method: 'POST',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify({ allowApproval: true, allowSignature: true, customerEmail: shareEmail })
            });
            if (res.ok) {
                onLineItemUpdate(); // Refresh session to get active share
                alert(shareEmail ? 'Share link generated and email sent!' : 'Share link generated.');
                setShowShareModal(false);
                setShareEmail('');
            } else {
                const err = await res.text();
                alert(err || "Failed to generate share link.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSharing(false);
        }
    };

    const handleSendReminder = async () => {
        if (!shareEmail) {
            alert("Please enter a customer email to send a reminder.");
            return;
        }
        setIsReminding(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/vero/lens/sessions/${session.id}/share/reminder`, {
                method: 'POST',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerEmail: shareEmail })
            });
            if (res.ok) {
                onLineItemUpdate();
                alert("Reminder sent!");
                setShareEmail('');
            } else {
                const err = await res.text();
                alert(err || "Failed to send reminder.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsReminding(false);
        }
    };

    const handleRevokeShare = async () => {
        setIsSharing(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/vero/lens/sessions/${session.id}/share`, { headers: { ...((await getAuthHeader()) as any) },
                method: 'DELETE'
            });
            if (res.ok) {
                onLineItemUpdate();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSharing(false);
        }
    };

    const handleCreateVersion = async () => {
        if (!versionSummary.trim()) {
            alert("Please provide a summary of what changed.");
            return;
        }
        setIsVersioning(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/vero/lens/sessions/${session.id}/versions`, {
                method: 'POST',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify({ changeSummary: versionSummary })
            });
            if (res.ok) {
                onLineItemUpdate();
                setShowVersionModal(false);
                setVersionSummary('');
            } else {
                const err = await res.text();
                alert(err || "Failed to create version snapshot.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsVersioning(false);
        }
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://verihub.app';
    const shareUrl = activeShare ? `${baseUrl}/quote/${activeShare.token}` : '';

    const renderConfidence = (score: number | null | undefined) => {
        if (score === null || score === undefined) return null;
        if (score >= 0.8) {
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500">High Confidence</span>;
        }
        if (score >= 0.5) {
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500">Needs Review</span>;
        }
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500">Low Confidence</span>;
    };

    const nextVersionNumber = session.versions ? session.versions.length + 1 : 1;

    return (
        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Live Editing Status */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
                <div>
                    <h3 className="text-blue-900 font-bold text-sm">Live Editing Session</h3>
                    <p className="text-blue-700 text-xs mt-1">Changes made here are drafted for <strong>Version {nextVersionNumber}</strong>.</p>
                </div>
                <button 
                    onClick={() => setShowVersionModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                    Create Snapshot (V{nextVersionNumber})
                </button>
            </div>

            {/* Image Annotation Canvas */}
            {latestImage && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            </svg>
                            Mark Up Image
                        </h3>
                    </div>
                    <LensAnnotationCanvas 
                        imageId={latestImage.id} 
                        imageUrl={latestImage.imageUrl} 
                        initialAnnotations={typeof latestImage.annotations === 'string' ? JSON.parse(latestImage.annotations) : latestImage.annotations || []}
                    />
                    <div className="mt-4 flex justify-end">
                        <button 
                            onClick={() => setShowReAnalyzeModal(true)}
                            className="bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-hover)] px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Re-analyze with Annotations
                        </button>
                    </div>
                </div>
            )}

            {/* AI Summary Card */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        AI Summary
                    </h3>
                    {renderConfidence(session.confidenceScore)}
                </div>
                <p className="text-[var(--text)] leading-relaxed text-sm mb-4">
                    {session.aiSummary}
                </p>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-3 text-amber-600 dark:text-amber-500 text-sm">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="font-medium">
                        {session.disclaimer || "Vero AI needs additional information to improve this estimate. Measurements or material details may improve estimate accuracy."}
                    </p>
                </div>
            </div>

            {/* Suggested Line Items */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-[var(--text)]">Draft Estimate Lines</h3>
                
                {session.lineItems?.map((item: any) => (
                    <div key={item.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                        {editingItemId === item.id ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted)] mb-1">Title</label>
                                    <input 
                                        type="text" 
                                        value={editForm.title} 
                                        onChange={e => setEditForm({...editForm, title: e.target.value})}
                                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted)] mb-1">Description</label>
                                    <textarea 
                                        value={editForm.description || ''} 
                                        onChange={e => setEditForm({...editForm, description: e.target.value})}
                                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-indigo-500 h-20"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted)] mb-1">Quantity</label>
                                        <input 
                                            type="number" 
                                            value={editForm.quantity} 
                                            onChange={e => setEditForm({...editForm, quantity: e.target.value})}
                                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted)] mb-1">Unit</label>
                                        <input 
                                            type="text" 
                                            value={editForm.unit || ''} 
                                            onChange={e => setEditForm({...editForm, unit: e.target.value})}
                                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted)] mb-1">Estimated Low ($)</label>
                                        <input 
                                            type="number" 
                                            value={editForm.estimatedPriceLow || ''} 
                                            onChange={e => setEditForm({...editForm, estimatedPriceLow: e.target.value})}
                                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted)] mb-1">Estimated High ($)</label>
                                        <input 
                                            type="number" 
                                            value={editForm.estimatedPriceHigh || ''} 
                                            onChange={e => setEditForm({...editForm, estimatedPriceHigh: e.target.value})}
                                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button 
                                        onClick={() => setEditingItemId(null)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSaveEdit}
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-[var(--text)]">{item.title}</h4>
                                        {renderConfidence(item.confidence)}
                                    </div>
                                    <p className="text-sm text-[var(--muted)] mb-3">{item.description}</p>
                                    
                                    <div className="flex flex-wrap gap-4 text-sm bg-[var(--bg)] rounded-xl p-3 border border-[var(--border)]">
                                        <div>
                                            <span className="text-[var(--muted)] text-xs block mb-0.5">Quantity</span>
                                            <span className="font-medium text-[var(--text)]">{item.quantity} {item.unit}</span>
                                        </div>
                                        {(item.estimatedPriceLow || item.estimatedPriceHigh) && (
                                            <div>
                                                <span className="text-[var(--muted)] text-xs block mb-0.5">Estimated Price Range</span>
                                                <span className="font-medium text-[var(--text)]">
                                                    ${item.estimatedPriceLow || 0} - ${item.estimatedPriceHigh || 0}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleEditClick(item)}
                                    className="p-2 text-[var(--muted)] hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Follow up questions */}
            {session.questions && session.questions.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                    <h3 className="text-lg font-bold text-[var(--text)]">Follow-up Questions</h3>
                    <p className="text-sm text-[var(--muted)] mb-4">Answer these to improve your final quote.</p>
                    
                    {session.questions.map((q: any) => (
                        <div key={q.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                            <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                {q.question}
                                {q.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <input 
                                type="text"
                                defaultValue={q.answer || ''}
                                onBlur={(e) => handleQuestionAnswer(q.id, e.target.value)}
                                placeholder="Type your answer here..."
                                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text)] outline-none focus:border-indigo-500"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="pt-8 flex flex-col sm:flex-row gap-4">
                {session.status !== 'SAVED' && (
                    <button 
                        onClick={handleSaveDraft}
                        disabled={isSaving}
                        className="flex-1 bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--card-hover)] text-[var(--text)] font-semibold py-3 px-6 rounded-xl transition-all shadow-sm disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "Save Draft Estimate"}
                    </button>
                )}
                
                {session.status === 'SAVED' && !session.convertedInvoiceId ? (
                    <button 
                        onClick={() => setShowConfirmModal(true)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all hover:-translate-y-1"
                    >
                        Create Invoice from Vero Lens
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                ) : (
                    <button 
                        disabled 
                        className={clsx(
                            "flex-1 font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed group relative",
                            session.convertedInvoiceId ? "bg-emerald-500/10 text-emerald-600" : "bg-indigo-600/50 text-white/70"
                        )}
                    >
                        {session.convertedInvoiceId ? "Converted to Invoice" : "Create Invoice from Vero Lens"}
                        {!session.convertedInvoiceId && (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        )}
                        {/* Tooltip */}
                        {!session.convertedInvoiceId && (
                            <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all bg-[var(--text)] text-[var(--bg)] text-xs rounded px-2 py-1 whitespace-nowrap">
                                Save draft first
                            </div>
                        )}
                    </button>
                )}
            </div>

            {/* Activity Timeline */}
            {session.events && session.events.length > 0 && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm mt-6">
                    <h3 className="text-lg font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Activity Timeline
                    </h3>
                    <div className="space-y-4">
                        {session.events.map((event: any, index: number) => (
                            <div key={event.id} className="flex gap-4 relative">
                                {index !== session.events.length - 1 && (
                                    <div className="absolute top-4 left-[3px] w-0.5 h-full bg-gray-200 dark:bg-gray-700"></div>
                                )}
                                <div className="mt-1 relative z-10">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                </div>
                                <div className="pb-2">
                                    <p className="text-sm font-medium text-[var(--text)]">{event.message}</p>
                                    <p className="text-xs text-[var(--muted)]">{format(new Date(event.createdAt), 'MMM d, yyyy h:mm a')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Version History */}
            {session.versions && session.versions.length > 0 && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm mt-6">
                    <h3 className="text-lg font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Version History
                    </h3>
                    <div className="space-y-3">
                        {session.versions.map((v: any) => (
                            <div key={v.id} className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-[var(--text)]">Version {v.versionNumber}</span>
                                        {session.activeVersionId === v.id && (
                                            <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                                Active (Customer Facing)
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-[var(--muted)] mt-1">{v.changeSummary}</p>
                                </div>
                                <div className="text-xs text-[var(--muted)] whitespace-nowrap">
                                    {format(new Date(v.createdAt), 'MMM d, yyyy')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                        <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text)] mb-2">Convert to Draft Invoice</h2>
                        <p className="text-[var(--text)] text-sm mb-4">
                            This will map all your current line items into a standard Vero Invoice. The invoice will be created in <span className="font-bold">DRAFT</span> status.
                        </p>
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 text-sm p-3 rounded-xl mb-6">
                            <strong>Important:</strong> Review all AI-assisted line items and pricing before sending this invoice to a customer.
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowConfirmModal(false)}
                                disabled={isConverting}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-hover)] font-medium transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConvert}
                                disabled={isConverting}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors flex items-center justify-center disabled:opacity-50"
                            >
                                {isConverting ? "Converting..." : "Convert Now"}
                            </button>
                        </div>
                        <div className="absolute top-4 right-4 text-[10px] font-bold tracking-widest uppercase text-indigo-500/50">
                            Powered by Vero AI
                        </div>
                    </div>
                </div>
            )}

            {/* Re-Analyze Modal */}
            {showReAnalyzeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                        <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text)] mb-2">Re-analyze Image</h2>
                        <p className="text-[var(--text)] text-sm mb-4">
                            Vero AI will review your annotations and suggest additional line items based on your markup.
                        </p>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-500 text-sm p-3 rounded-xl mb-6">
                            <strong>Safe Mode:</strong> Any line items you have manually edited will be preserved. New AI suggestions will simply be appended to your estimate.
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowReAnalyzeModal(false)}
                                disabled={isReAnalyzing}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-hover)] font-medium transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleReAnalyze}
                                disabled={isReAnalyzing}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors flex items-center justify-center disabled:opacity-50"
                            >
                                {isReAnalyzing ? "Analyzing..." : "Re-analyze Now"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg)]">
                            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                                Share Quote
                            </h2>
                            <button onClick={() => setShowShareModal(false)} className="text-[var(--muted)] hover:text-[var(--text)]">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {!activeShare ? (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-[var(--text)] mb-2">Create Share Link</h3>
                                    <p className="text-[var(--muted)] text-sm mb-6 max-w-sm mx-auto">
                                        Generate a secure, public link to send to your customer. They will be able to review annotations, line items, and digitally approve the quote.
                                    </p>
                                    <div className="max-w-xs mx-auto mb-6 text-left">
                                        <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Customer Email (Optional)</label>
                                        <input 
                                            type="email" 
                                            placeholder="Enter customer email"
                                            value={shareEmail}
                                            onChange={e => setShareEmail(e.target.value)}
                                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleCreateShare}
                                        disabled={isSharing}
                                        className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-50"
                                    >
                                        {isSharing ? 'Generating...' : (shareEmail ? 'Send Email & Generate Link' : 'Generate Public Link')}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
                                        <svg className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                            <p className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">Link is active</p>
                                            <p className="text-emerald-600/80 dark:text-emerald-400/80 text-xs mt-0.5">
                                                {activeShare.approvedAt ? 'Customer has approved this quote.' : (activeShare.rejectedAt ? 'Customer rejected this quote.' : (activeShare.viewedAt ? 'Customer has viewed the quote.' : 'Waiting for customer review.'))}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Public Link</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                readOnly 
                                                value={shareUrl}
                                                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-mono text-[var(--text)] outline-none"
                                            />
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(shareUrl);
                                                    alert("Link copied!");
                                                }}
                                                className="bg-[var(--card-hover)] border border-[var(--border)] text-[var(--text)] px-4 rounded-xl text-sm font-medium hover:bg-[var(--bg)] transition-colors"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Customer Email (For Reminder)</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="email" 
                                                placeholder="Enter customer email"
                                                value={shareEmail}
                                                onChange={e => setShareEmail(e.target.value)}
                                                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-indigo-500"
                                            />
                                            <button 
                                                onClick={handleSendReminder}
                                                disabled={isReminding || !shareEmail}
                                                className="bg-indigo-600 text-white px-4 rounded-xl text-sm font-bold hover:bg-indigo-500 transition-colors disabled:opacity-50"
                                            >
                                                {isReminding ? 'Sending...' : 'Send Reminder'}
                                            </button>
                                        </div>
                                        {activeShare.reminderCount > 0 && (
                                            <p className="text-xs text-[var(--muted)] mt-2">Reminders sent: {activeShare.reminderCount} (Last: {activeShare.lastReminderSentAt ? format(new Date(activeShare.lastReminderSentAt), 'MMM d, h:mm a') : 'N/A'})</p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 pt-4 border-t border-[var(--border)]">
                                        <a 
                                            href={shareUrl} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-500 transition-colors text-center flex justify-center items-center gap-2"
                                        >
                                            Open Customer View
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </a>
                                        <a 
                                            href={`/api/public/lens/quote/${activeShare.token}/pdf`}
                                            target="_blank"
                                            className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] font-bold py-3 px-4 rounded-xl hover:bg-[var(--card-hover)] transition-colors text-center flex justify-center items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            Export PDF
                                        </a>
                                        <button 
                                            onClick={handleRevokeShare}
                                            disabled={isSharing}
                                            className="w-full text-red-500 font-bold py-3 px-4 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-center disabled:opacity-50 mt-2"
                                        >
                                            Revoke Access Link
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Version Modal */}
            {showVersionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                        <h2 className="text-xl font-bold text-[var(--text)] mb-2">Create Version {nextVersionNumber}</h2>
                        <p className="text-[var(--text)] text-sm mb-4">
                            This will create an immutable snapshot of the current line items, pricing, and annotations. The active share link will point to this new version.
                        </p>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-[var(--text)] mb-2">What Changed? (Revision Summary)</label>
                            <textarea
                                value={versionSummary}
                                onChange={e => setVersionSummary(e.target.value)}
                                placeholder="e.g. Added line items for extra trim work."
                                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-indigo-500 min-h-[100px]"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowVersionModal(false)}
                                disabled={isVersioning}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-hover)] font-medium transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleCreateVersion}
                                disabled={isVersioning}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors flex items-center justify-center disabled:opacity-50"
                            >
                                {isVersioning ? "Creating..." : "Save Snapshot"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
