"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type PollOption = {
    id: string;
    text: string;
    _count: { votes: number };
};

type Poll = {
    id: string;
    question: string;
    description: string | null;
    isActive: boolean;
    hasVoted: boolean;
    userVoteOptionId: string | null;
    options: PollOption[];
    _count: { votes: number };
};

export default function FeedbackPage() {
    const [type, setType] = useState('positive');
    const [message, setMessage] = useState('');
    const [rating, setRating] = useState('5');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const [polls, setPolls] = useState<Poll[]>([]);
    const [isLoadingPolls, setIsLoadingPolls] = useState(true);
    const [votingPollId, setVotingPollId] = useState<string | null>(null);

    const router = useRouter();

    useEffect(() => {
        fetchPolls();
    }, []);

    const fetchPolls = async () => {
        try {
            const res = await fetch('/api/polls');
            if (res.ok) {
                const data = await res.json();
                setPolls(data);
            }
        } catch (error) {
            console.error('Failed to fetch polls');
        } finally {
            setIsLoadingPolls(false);
        }
    };

    const handleVote = async (pollId: string, optionId: string) => {
        setVotingPollId(pollId);
        try {
            const res = await fetch(`/api/polls/${pollId}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ optionId })
            });

            if (res.ok) {
                // Optimistically update the UI to show the vote
                setPolls(currentPolls => currentPolls.map(poll => {
                    if (poll.id === pollId) {
                        return {
                            ...poll,
                            hasVoted: true,
                            userVoteOptionId: optionId,
                            _count: { votes: poll._count.votes + 1 },
                            options: poll.options.map(opt =>
                                opt.id === optionId
                                    ? { ...opt, _count: { votes: opt._count.votes + 1 } }
                                    : opt
                            )
                        };
                    }
                    return poll;
                }));
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to submit vote');
            }
        } catch (error) {
            alert('A network error occurred while voting.');
        } finally {
            setVotingPollId(null);
        }
    };

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
            <div className="max-w-4xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left Column: Feedback Form */}
                <div className="lg:col-span-3">
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

                {/* Right Column: Community Polls */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="hidden lg:block h-[52px]"></div> {/* Spacer to align with form box */}

                    <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                        </svg>
                        Community Polls
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                        Vote on upcoming features and help shape the direction of Receipt Hub.
                    </p>

                    {isLoadingPolls ? (
                        <div className="animate-pulse space-y-4">
                            <div className="h-32 bg-[#111827] rounded-xl border border-white/5"></div>
                            <div className="h-32 bg-[#111827] rounded-xl border border-white/5"></div>
                        </div>
                    ) : polls.length === 0 ? (
                        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 text-center">
                            <p className="text-gray-500 text-sm">No active polls at the moment. Check back later!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {polls.map((poll) => (
                                <div key={poll.id} className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-lg relative overflow-hidden">
                                    {poll.hasVoted && (
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                                    )}

                                    <h4 className="text-base font-bold text-gray-100 mb-1 relative z-10">{poll.question}</h4>
                                    {poll.description && (
                                        <p className="text-xs text-gray-400 mb-4 relative z-10">{poll.description}</p>
                                    )}

                                    <div className="space-y-2 mt-4 relative z-10">
                                        {poll.options.map((opt) => {
                                            const totalVotes = poll._count.votes;
                                            const isMyVote = poll.userVoteOptionId === opt.id;
                                            const percentage = totalVotes > 0 ? Math.round((opt._count.votes / totalVotes) * 100) : 0;

                                            if (poll.hasVoted) {
                                                // Voted State UI (Results)
                                                return (
                                                    <div key={opt.id} className="relative">
                                                        <div className="flex justify-between items-center mb-1 px-3 pt-2 relative z-10">
                                                            <span className={`text-sm font-medium ${isMyVote ? 'text-indigo-300' : 'text-gray-300'}`}>
                                                                {opt.text} {isMyVote && '(You)'}
                                                            </span>
                                                            <span className="text-xs text-gray-400 font-medium">{percentage}%</span>
                                                        </div>
                                                        <div className={`absolute inset-0 rounded-lg border ${isMyVote ? 'border-indigo-500/30 bg-[#0B1220]/50' : 'border-gray-800 bg-[#0B1220]'} overflow-hidden`}>
                                                            <div
                                                                className={`h-full transition-all duration-1000 ease-out ${isMyVote ? 'bg-indigo-500/20' : 'bg-white/5'}`}
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Unvoted State UI (Interactive Buttons)
                                            return (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => handleVote(poll.id, opt.id)}
                                                    disabled={votingPollId === poll.id}
                                                    className="w-full text-left px-4 py-3 rounded-lg border border-white/10 bg-[#0F172A] hover:bg-white/5 hover:border-white/20 transition-all text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                                >
                                                    {opt.text}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {poll.hasVoted && (
                                        <div className="mt-4 pt-3 border-t border-white/5 text-xs text-gray-500 flex justify-between items-center relative z-10">
                                            <span>Total votes: {poll._count.votes}</span>
                                            <span className="text-emerald-500 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Vote Recorded
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
