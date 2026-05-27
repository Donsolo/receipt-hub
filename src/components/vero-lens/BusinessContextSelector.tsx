"use client";

import { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { TradePreset, getTradePreset } from '@/lib/vero-ai/tradePresets';

interface BusinessContextSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

interface CustomContext {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
}

export default function BusinessContextSelector({ value, onChange }: BusinessContextSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [customContexts, setCustomContexts] = useState<CustomContext[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newContextName, setNewContextName] = useState('');
    const [newContextDescription, setNewContextDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchCustomContexts();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsCreating(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchCustomContexts = async () => {
        try {
            const res = await fetch('/api/vero/lens/custom-contexts');
            if (res.ok) {
                const data = await res.json();
                setCustomContexts(data);
            }
        } catch (err) {
            console.error('Failed to fetch custom contexts', err);
        }
    };

    const handleCreateCustom = async () => {
        if (!newContextName.trim()) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/vero/lens/custom-contexts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: newContextName, 
                    description: newContextDescription 
                })
            });
            
            if (res.ok) {
                const newContext = await res.json();
                setCustomContexts(prev => [newContext, ...prev]);
                onChange(`custom_${newContext.id}`);
                setIsCreating(false);
                setIsOpen(false);
                setNewContextName('');
                setNewContextDescription('');
            } else {
                const err = await res.text();
                alert(err);
            }
        } catch (err) {
            alert('Failed to create custom context.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const groups = [
        {
            title: "Popular",
            items: [
                { id: "general_contracting", name: "General Contracting" },
                { id: "roofing", name: "Roofing" },
                { id: "landscaping", name: "Landscaping" },
                { id: "cleaning_services", name: "Cleaning Services" },
            ]
        },
        {
            title: "Service Trades",
            items: [
                { id: "plumbing", name: "Plumbing" },
                { id: "electrical", name: "Electrical" },
                { id: "hvac", name: "HVAC" },
                { id: "handyman", name: "Handyman" },
                { id: "painting", name: "Painting" },
                { id: "drywall", name: "Drywall" },
                { id: "flooring", name: "Flooring" },
                { id: "concrete", name: "Concrete" },
                { id: "remodeling", name: "Remodeling" },
                { id: "fence_installation", name: "Fence Installation" },
                { id: "tree_services", name: "Tree Services" },
                { id: "snow_removal", name: "Snow Removal" },
                { id: "pressure_washing", name: "Pressure Washing" },
                { id: "lawncare", name: "Lawn Care" },
                { id: "pool_services", name: "Pool Services" },
                { id: "pest_control", name: "Pest Control" },
                { id: "appliance_repair", name: "Appliance Repair" },
                { id: "welding", name: "Welding" },
                { id: "industrial_maintenance", name: "Industrial Maintenance" },
                { id: "security_camera_installation", name: "Security Camera Installation" },
                { id: "low_voltage_networking", name: "Low Voltage / Networking" },
                { id: "moving_services", name: "Moving Services" },
                { id: "junk_removal", name: "Junk Removal" },
            ]
        },
        {
            title: "Automotive",
            items: [
                { id: "auto_detailing", name: "Auto Detailing" },
                { id: "mobile_mechanic", name: "Mobile Mechanic" },
                { id: "towing", name: "Towing" },
                { id: "window_tinting", name: "Window Tinting" },
                { id: "marine_detailing", name: "Marine Detailing" },
            ]
        },
        {
            title: "Creative & Professional",
            items: [
                { id: "photography", name: "Photography" },
                { id: "videography", name: "Videography" },
                { id: "dj_services", name: "DJ Services" },
                { id: "event_services", name: "Event Services" },
                { id: "notary", name: "Notary" },
            ]
        },
        {
            title: "Beauty & Personal Care",
            items: [
                { id: "beauty", name: "Beauty" },
                { id: "barber", name: "Barber" },
                { id: "tattoo_artist", name: "Tattoo Artist" },
                { id: "pet_grooming", name: "Pet Grooming" },
                { id: "personal_training", name: "Personal Training" },
            ]
        }
    ];

    // Build the options list based on search
    const lowerSearch = search.toLowerCase();
    
    const filteredCustom = customContexts.filter(c => c.name.toLowerCase().includes(lowerSearch));
    
    const filteredGroups = groups.map(g => ({
        ...g,
        items: g.items.filter(i => i.name.toLowerCase().includes(lowerSearch))
    })).filter(g => g.items.length > 0);

    const hasResults = filteredCustom.length > 0 || filteredGroups.length > 0;

    let displayLabel = "Select a business context...";
    if (value) {
        if (value.startsWith('custom_')) {
            const cid = value.replace('custom_', '');
            const found = customContexts.find(c => c.id === cid);
            if (found) displayLabel = found.name;
        } else {
            // Find in groups or use preset fallback
            let foundName = null;
            for (const g of groups) {
                const found = g.items.find(i => i.id === value);
                if (found) foundName = found.name;
            }
            if (foundName) {
                displayLabel = foundName;
            } else {
                const preset = getTradePreset(value);
                displayLabel = preset.label;
            }
        }
    }

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {/* Trigger */}
            <div 
                onClick={() => {
                    setIsOpen(!isOpen);
                    setIsCreating(false);
                    setSearch('');
                }}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-2xl pl-5 pr-12 py-4 text-[var(--text)] font-semibold shadow-inner hover:border-indigo-500/50 cursor-pointer flex items-center justify-between transition-all group"
            >
                <span className="truncate">{displayLabel}</span>
                <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                    <svg className={clsx("w-5 h-5 text-[var(--muted)] opacity-70 transition-transform duration-300", isOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 mt-2 w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col max-h-[400px]">
                    {!isCreating ? (
                        <>
                            <div className="p-3 border-b border-[var(--border)] bg-[var(--bg)]/50 backdrop-blur-sm sticky top-0 z-10">
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input 
                                        type="text" 
                                        placeholder="Search business context..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-0 pl-9 pr-4 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] outline-none"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            
                            <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
                                {customContexts.length > 0 && (filteredCustom.length > 0 || search === '') && (
                                    <div className="mb-4">
                                        <div className="px-3 py-1.5 text-xs font-bold text-[var(--muted)] uppercase tracking-wider">My Custom Contexts</div>
                                        {filteredCustom.map(c => (
                                            <button 
                                                key={c.id} 
                                                onClick={() => { onChange(`custom_${c.id}`); setIsOpen(false); }}
                                                className={clsx(
                                                    "w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2",
                                                    value === `custom_${c.id}` ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "text-[var(--text)] hover:bg-[var(--bg)]"
                                                )}
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {filteredGroups.map(group => (
                                    <div key={group.title} className="mb-4">
                                        <div className="px-3 py-1.5 text-xs font-bold text-[var(--muted)] uppercase tracking-wider">{group.title}</div>
                                        {group.items.map(item => (
                                            <button 
                                                key={item.id} 
                                                onClick={() => { onChange(item.id); setIsOpen(false); }}
                                                className={clsx(
                                                    "w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                                    value === item.id ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "text-[var(--text)] hover:bg-[var(--bg)]"
                                                )}
                                            >
                                                {item.name}
                                            </button>
                                        ))}
                                    </div>
                                ))}

                                {!hasResults && (
                                    <div className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                                        No contexts found.
                                    </div>
                                )}
                            </div>

                            <div className="p-2 border-t border-[var(--border)] bg-[var(--bg)]/50">
                                <button 
                                    onClick={() => setIsCreating(true)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create Custom Context
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="p-5 flex flex-col gap-4 bg-[var(--card)]">
                            <div>
                                <h3 className="text-lg font-bold text-[var(--text)]">Create Custom Context</h3>
                                <p className="text-xs text-[var(--muted)] mt-1">Define a custom trade or business niche to improve AI intelligence and pricing.</p>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--muted)] mb-1 uppercase tracking-wider">Context Name *</label>
                                    <input 
                                        type="text" 
                                        value={newContextName}
                                        onChange={e => setNewContextName(e.target.value)}
                                        placeholder="e.g. Marine Ceramic Coating"
                                        maxLength={60}
                                        autoFocus
                                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--muted)] mb-1 uppercase tracking-wider">Description (Optional)</label>
                                    <textarea 
                                        value={newContextDescription}
                                        onChange={e => setNewContextDescription(e.target.value)}
                                        placeholder="Describe the typical scope, materials, or challenges to help the AI."
                                        rows={3}
                                        maxLength={300}
                                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-2">
                                <button 
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-2.5 text-sm font-semibold text-[var(--text)] bg-[var(--bg)] border border-[var(--border)] rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleCreateCustom}
                                    disabled={!newContextName.trim() || isSubmitting}
                                    className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Context'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
