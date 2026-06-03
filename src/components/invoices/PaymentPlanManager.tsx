import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
"use client";

import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface Installment {
    id?: string;
    label: string | null;
    amount: number;
    dueDate: string | null;
    status: string;
}

interface PaymentPlanManagerProps {
    invoiceId: string;
    invoiceTotal: number;
    initialPlanEnabled: boolean;
    initialInstallments: Installment[];
}

export default function PaymentPlanManager({ invoiceId, invoiceTotal, initialPlanEnabled, initialInstallments }: PaymentPlanManagerProps) {
    const router = useRouter();
    const [enabled, setEnabled] = useState(initialPlanEnabled);
    const [installments, setInstallments] = useState<Installment[]>(initialInstallments || []);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const sumOfInstallments = installments.reduce((acc, inst) => acc + Number(inst.amount || 0), 0);
    const isValidTotal = Math.abs(sumOfInstallments - invoiceTotal) < 0.01;
    const hasPaidInstallments = installments.some(i => i.status === 'PAID');

    useEffect(() => {
        // If enabling for the first time and empty, suggest a 50/50 split
        if (enabled && installments.length === 0) {
            setInstallments([
                { label: 'Deposit', amount: Number((invoiceTotal / 2).toFixed(2)), dueDate: '', status: 'UNPAID' },
                { label: 'Final Payment', amount: Number((invoiceTotal - Number((invoiceTotal / 2).toFixed(2))).toFixed(2)), dueDate: '', status: 'UNPAID' }
            ]);
        }
    }, [enabled, installments.length, invoiceTotal]);

    const handleAdd = () => {
        setInstallments([...installments, { label: `Installment ${installments.length + 1}`, amount: 0, dueDate: '', status: 'UNPAID' }]);
    };

    const handleRemove = (index: number) => {
        if (installments[index].status === 'PAID') return;
        const newArr = [...installments];
        newArr.splice(index, 1);
        setInstallments(newArr);
    };

    const handleUpdate = (index: number, field: keyof Installment, value: any) => {
        const newArr = [...installments];
        // Don't allow changing amount of paid
        if (newArr[index].status === 'PAID' && field === 'amount') return;
        newArr[index] = { ...newArr[index], [field]: value };
        setInstallments(newArr);
    };

    const handleSplit = (parts: number) => {
        if (hasPaidInstallments) return;
        const baseAmount = Number((invoiceTotal / parts).toFixed(2));
        const newArr: Installment[] = [];
        let runningTotal = 0;
        
        for (let i = 0; i < parts; i++) {
            const isLast = i === parts - 1;
            const amount = isLast ? Number((invoiceTotal - runningTotal).toFixed(2)) : baseAmount;
            runningTotal += amount;
            newArr.push({
                label: i === 0 ? 'Deposit' : isLast ? 'Final Payment' : `Milestone ${i}`,
                amount: amount,
                dueDate: '',
                status: 'UNPAID'
            });
        }
        setInstallments(newArr);
    };

    const savePlan = async () => {
        if (enabled && !isValidTotal) {
            setError(`Total must equal invoice total ($${invoiceTotal.toFixed(2)}). Currently: $${sumOfInstallments.toFixed(2)}`);
            return;
        }

        setIsSaving(true);
        setError('');

        try {
            const res = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}/installments`, {
                method: 'POST',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentPlanEnabled: enabled,
                    installments: enabled ? installments.map(i => ({ ...i, amount: Number(i.amount) })) : []
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save payment plan');

            setInstallments(data.installments);
            alert('Payment plan updated successfully.');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm mb-8 mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[var(--border)] pb-4">
                <div>
                    <h3 className="text-lg font-bold text-[var(--text)]">Payment Plan</h3>
                    <p className="text-sm text-[var(--muted)]">Split this invoice into structured installments.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[var(--text)]">{enabled ? 'Enabled' : 'Disabled'}</span>
                    <button 
                        onClick={() => {
                            if (hasPaidInstallments && enabled) {
                                alert("Cannot disable plan because some installments are already paid.");
                                return;
                            }
                            setEnabled(!enabled);
                        }}
                        className={clsx("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", enabled ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-700")}
                    >
                        <span className={clsx("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", enabled ? "translate-x-6" : "translate-x-1")} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-sm font-medium">
                    {error}
                </div>
            )}

            {enabled && (
                <div className="space-y-4">
                    {!hasPaidInstallments && (
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => handleSplit(2)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors">Split 50/50</button>
                            <button onClick={() => handleSplit(3)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors">Split into 3</button>
                            <button onClick={() => handleSplit(4)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors">Split into 4</button>
                        </div>
                    )}

                    {installments.map((inst, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)] relative group">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                                <div>
                                    <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Label</label>
                                    <input 
                                        type="text" 
                                        value={inst.label || ''} 
                                        onChange={e => handleUpdate(index, 'label', e.target.value)}
                                        placeholder="e.g. Deposit"
                                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 text-[var(--text)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={inst.amount === 0 ? '' : inst.amount} 
                                            onChange={e => handleUpdate(index, 'amount', e.target.value)}
                                            disabled={inst.status === 'PAID'}
                                            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg pl-6 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 text-[var(--text)] disabled:opacity-50"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Due Date</label>
                                    <input 
                                        type="date" 
                                        value={inst.dueDate ? inst.dueDate.split('T')[0] : ''} 
                                        onChange={e => handleUpdate(index, 'dueDate', e.target.value)}
                                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 text-[var(--text)] [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-3 mt-2 sm:mt-5">
                                <span className={clsx("text-xs font-bold px-2 py-1 rounded-md", 
                                    inst.status === 'PAID' ? "bg-emerald-500/10 text-emerald-500" : 
                                    inst.status === 'PAYMENT_PENDING' ? "bg-yellow-500/10 text-yellow-500" : 
                                    "bg-gray-500/10 text-gray-500"
                                )}>
                                    {inst.status}
                                </span>
                                
                                {inst.status !== 'PAID' && (
                                    <button 
                                        onClick={() => handleRemove(index)}
                                        className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                                        title="Remove Installment"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    <div className="flex justify-between items-center pt-4">
                        <button 
                            onClick={handleAdd}
                            className="text-sm font-bold text-blue-500 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Add Custom Installment
                        </button>
                        
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">Sum of Installments</span>
                            <span className={clsx("text-lg font-black tabular-nums tracking-tight", isValidTotal ? "text-emerald-500" : "text-red-500")}>
                                ${sumOfInstallments.toFixed(2)} <span className="text-sm text-[var(--muted)] font-medium">/ ${invoiceTotal.toFixed(2)}</span>
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-6 border-t border-[var(--border)] pt-4 flex justify-end">
                <button 
                    onClick={savePlan}
                    disabled={isSaving || (enabled && !isValidTotal)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                    {isSaving ? 'Saving...' : 'Save Payment Plan'}
                </button>
            </div>
        </div>
    );
}
