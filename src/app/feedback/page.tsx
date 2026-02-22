"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FeedbackPage() {
    const [type, setType] = useState('positive');
    const [message, setMessage] = useState('');
    const [rating, setRating] = useState('5');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    message,
                    rating: type === 'positive' ? parseInt(rating) : null
                }),
            });

            if (res.ok) {
                setIsSuccess(true);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to submit feedback');
            }
        } catch (err) {
            setError('A network error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B1220] px-4 py-12 flex flex-col pt-24">
            <div className="max-w-xl mx-auto w-full relative z-10">
                <div className="mb-6 flex items-center justify-between">
                    <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group text-sm">
                        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </Link>
                </div>

                <div className="bg-[#111827] border border-[#1F2937] rounded-2xl shadow-xl overflow-hidden relative">
                    {/* Header */}
                    <div className="px-6 py-8 sm:p-10 border-b border-[#1F2937] bg-gradient-to-br from-[#111827] to-[#0F172A] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <h2 className="text-2xl font-bold text-white mb-2 relative z-10">Share Your Feedback</h2>
                        <p className="text-sm text-gray-400 relative z-10">
                            Help us improve the core workspace. Let us know what you love, what to add, or what's broken.
                        </p>
                    </div>

                    {isSuccess ? (
                        <div className="p-8 sm:p-10 text-center">
                            <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400">
                                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Thank you!</h3>
                            <p className="text-gray-400 mb-8">Your feedback has been successfully submitted to the founder team.</p>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-6 bg-[#0F172A]">

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-200">What kind of feedback is this?</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="block w-full rounded-md border-0 bg-[#111827] ring-1 ring-inset ring-[#2D3748] focus:ring-2 focus:ring-inset focus:ring-indigo-500 py-3 pl-4 pr-10 text-gray-100 sm:text-sm sm:leading-6"
                                >
                                    <option value="positive">Positive / Love It (Review)</option>
                                    <option value="suggestion">Feature Suggestion</option>
                                    <option value="bug">Bug Report / Issue</option>
                                </select>
                            </div>

                            {type === 'positive' && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-200">How would you rate Receipt Hub?</label>
                                    <select
                                        value={rating}
                                        onChange={(e) => setRating(e.target.value)}
                                        className="block w-full rounded-md border-0 bg-[#111827] ring-1 ring-inset ring-[#2D3748] focus:ring-2 focus:ring-inset focus:ring-indigo-500 py-3 pl-4 pr-10 text-gray-100 sm:text-sm sm:leading-6"
                                    >
                                        <option value="5">⭐⭐⭐⭐⭐ - Exceptional</option>
                                        <option value="4">⭐⭐⭐⭐ - Great</option>
                                        <option value="3">⭐⭐⭐ - Good</option>
                                        <option value="2">⭐⭐ - Fair</option>
                                        <option value="1">⭐ - Poor</option>
                                    </select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-200">Your Message</label>
                                <textarea
                                    required
                                    rows={5}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder={type === 'bug' ? "What went wrong?" : type === 'suggestion' ? "What should we add or change?" : "What do you like best about Receipt Hub?"}
                                    className="block w-full rounded-md border-0 bg-[#111827] ring-1 ring-inset ring-[#2D3748] focus:ring-2 focus:ring-inset focus:ring-indigo-500 py-3 px-4 text-gray-100 sm:text-sm sm:leading-6"
                                />
                            </div>

                            {error && (
                                <div className="rounded-md bg-red-500/10 border border-red-500/20 p-4">
                                    <div className="flex">
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-red-500 text-center">{error}</h3>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !message.trim()}
                                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-colors ${(isSubmitting || !message.trim()) ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
