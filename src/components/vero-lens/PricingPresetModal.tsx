import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { getTradePreset } from '@/lib/vero-ai/tradePresets';

export default function PricingPresetModal({ isOpen, onClose, tradeMode }: { isOpen: boolean, onClose: () => void, tradeMode: string }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        defaultLaborRate: '',
        materialMarkupPct: '',
        minimumJobFee: '',
        travelFee: '',
        defaultUnit: '',
        notes: ''
    });
    const [displayName, setDisplayName] = useState(tradeMode);

    useEffect(() => {
        if (!isOpen) return;
        
        // Resolve display name
        if (tradeMode.startsWith('custom_')) {
            const fetchCustomName = async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/vero/lens/custom-contexts`, { headers: { ...((await getAuthHeader()) as any) } });
                    if (res.ok) {
                        const data = await res.json();
                        const found = data.find((c: any) => c.id === tradeMode.replace('custom_', ''));
                        if (found) setDisplayName(found.name);
                    }
                } catch(e) {}
            };
            fetchCustomName();
        } else {
            setDisplayName(getTradePreset(tradeMode).label);
        }

        const fetchPreset = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/vero/lens/pricing-presets`, { headers: { ...((await getAuthHeader()) as any) } });
                if (res.ok) {
                    const data = await res.json();
                    const preset = data.find((p: any) => p.tradeMode === tradeMode);
                    if (preset) {
                        setForm({
                            defaultLaborRate: preset.defaultLaborRate || '',
                            materialMarkupPct: preset.materialMarkupPct || '',
                            minimumJobFee: preset.minimumJobFee || '',
                            travelFee: preset.travelFee || '',
                            defaultUnit: preset.defaultUnit || '',
                            notes: preset.notes || ''
                        });
                    } else {
                        setForm({ defaultLaborRate: '', materialMarkupPct: '', minimumJobFee: '', travelFee: '', defaultUnit: '', notes: '' });
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchPreset();
    }, [isOpen, tradeMode]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            const body = {
                tradeMode,
                defaultLaborRate: form.defaultLaborRate ? parseFloat(form.defaultLaborRate) : null,
                materialMarkupPct: form.materialMarkupPct ? parseFloat(form.materialMarkupPct) : null,
                minimumJobFee: form.minimumJobFee ? parseFloat(form.minimumJobFee) : null,
                travelFee: form.travelFee ? parseFloat(form.travelFee) : null,
                defaultUnit: form.defaultUnit || null,
                notes: form.notes || null
            };
            const res = await fetch(`${API_BASE_URL}/api/vero/lens/pricing-presets`, {
                method: 'POST',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                onClose();
            } else {
                alert("Failed to save preset.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-[var(--text)] mb-1">Business Defaults</h2>
                <p className="text-[var(--muted)] text-sm mb-6 capitalize">{displayName} Preset</p>
                
                {loading ? (
                    <div className="animate-pulse h-32 flex items-center justify-center text-[var(--muted)]">Loading...</div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text)] mb-1">Default Labor Rate ($/hr)</label>
                                <input 
                                    type="number" 
                                    value={form.defaultLaborRate} 
                                    onChange={e => setForm({...form, defaultLaborRate: e.target.value})}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] outline-none focus:border-indigo-500"
                                    placeholder="e.g. 150"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text)] mb-1">Material Markup (%)</label>
                                <input 
                                    type="number" 
                                    value={form.materialMarkupPct} 
                                    onChange={e => setForm({...form, materialMarkupPct: e.target.value})}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] outline-none focus:border-indigo-500"
                                    placeholder="e.g. 20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text)] mb-1">Minimum Job Fee ($)</label>
                                <input 
                                    type="number" 
                                    value={form.minimumJobFee} 
                                    onChange={e => setForm({...form, minimumJobFee: e.target.value})}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] outline-none focus:border-indigo-500"
                                    placeholder="e.g. 100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text)] mb-1">Travel Fee ($)</label>
                                <input 
                                    type="number" 
                                    value={form.travelFee} 
                                    onChange={e => setForm({...form, travelFee: e.target.value})}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text)] mb-1">Default Unit</label>
                            <input 
                                type="text" 
                                value={form.defaultUnit} 
                                onChange={e => setForm({...form, defaultUnit: e.target.value})}
                                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] outline-none focus:border-indigo-500"
                                placeholder="e.g. sq ft, each, hour"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text)] mb-1">Notes / Instructions for AI</label>
                            <textarea 
                                value={form.notes} 
                                onChange={e => setForm({...form, notes: e.target.value})}
                                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] outline-none focus:border-indigo-500 h-24"
                                placeholder="Any special rules or pricing logic you want the AI to follow..."
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button 
                                onClick={onClose}
                                disabled={saving}
                                className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-hover)] font-medium disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Save Preset"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
