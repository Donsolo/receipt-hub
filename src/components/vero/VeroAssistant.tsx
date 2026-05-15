"use client";

// @ts-ignore
import { useChat } from 'ai/react';
import { useEffect, useRef, useState } from 'react';
// @ts-ignore
import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';
import Image from 'next/image';

export default function VeroAssistant({ initialInput = '', isOverlay = false, isEmbedded = false }: { initialInput?: string, isOverlay?: boolean, isEmbedded?: boolean }) {
    const intros = [
        "Hi! I am Vero, your AI business assistant. I can help you manage invoices, track receipts, and calculate finances. How can I help you today?",
        "Hello! I'm Vero. Ready to review your latest invoices or track receipts?",
        "Welcome back! I'm Vero, your Verihub assistant. What can I do for your business today?",
        "Greetings! Vero here. Need a quick summary of your revenue or pending invoices?"
    ];

    const [initialMessages] = useState([
        {
            id: 'welcome',
            role: 'assistant' as const,
            content: intros[Math.floor(Math.random() * intros.length)]
        }
    ]);

    const { messages, input, handleInputChange, handleSubmit, setInput, isLoading } = useChat({
        api: '/api/vero/chat',
        initialMessages: initialMessages,
        experimental_maxAutomaticRoundtrips: 5
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // Handle initial input (like from Voice over long press)
    useEffect(() => {
        if (initialInput) {
            setInput(initialInput);
        }
    }, [initialInput, setInput]);

    // Voice to Text Setup
    useEffect(() => {
        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInput((prev: any) => prev + (prev ? ' ' : '') + transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, [setInput]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            if (recognitionRef.current) {
                recognitionRef.current.start();
                setIsListening(true);
            } else {
                alert("Speech recognition is not supported in this browser.");
            }
        }
    };

    const onSubmit = (e: any) => {
        e.preventDefault();
        if (!input.trim()) return;
        handleSubmit(e);
    };

    return (
        <div className={clsx(
            "flex flex-col overflow-hidden bg-white dark:bg-[#0b1220] ring-1 ring-black/5 dark:ring-white/10 shadow-2xl",
            isOverlay ? "h-[80vh] rounded-t-3xl sm:rounded-3xl" : isEmbedded ? "h-[600px] md:h-[700px] rounded-3xl w-full" : "h-[600px] rounded-3xl w-full max-w-4xl mx-auto"
        )}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-black/20 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0A0F1A] overflow-hidden flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white relative">
                        <Image src="/images/vero-icon.png" alt="Vero Icon" fill className="object-cover" />
                        {isLoading && <span className="absolute top-0 right-0 w-3 h-3 bg-blue-400 border-2 border-white dark:border-[#0b1220] rounded-full animate-ping z-10"></span>}
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Vero Assistant</h2>
                        <p className="text-xs text-gray-500 dark:text-[var(--muted)] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
                        </p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {messages.filter((m: any) => m.content && m.content.trim() !== '').map((m: any) => (
                    <div key={m.id} className={clsx("flex w-full", m.role === 'user' ? "justify-end" : "justify-start")}>
                        <div className={clsx(
                            "max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-relaxed",
                            m.role === 'user' 
                                ? "bg-indigo-600 text-white rounded-tr-sm" 
                                : "bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-gray-100 rounded-tl-sm border border-black/5 dark:border-white/5"
                        )}>
                            <div className={clsx("prose prose-sm max-w-none", m.role === 'user' ? "prose-invert" : "dark:prose-invert")}>
                                <ReactMarkdown>{m.content}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex w-full justify-start">
                        <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-gray-100 dark:bg-white/5 rounded-tl-sm flex gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-[#0b1220]">
                <form onSubmit={onSubmit} className="relative flex items-center">
                    <input 
                        value={input}
                        onChange={handleInputChange}
                        placeholder={isListening ? "Listening..." : "Ask Vero anything..."}
                        className={clsx(
                            "w-full bg-gray-100 dark:bg-white/5 border border-transparent focus:border-indigo-500 dark:focus:border-indigo-500/50 rounded-2xl py-3.5 pl-5 pr-24 text-sm outline-none transition-all",
                            isListening ? "placeholder-indigo-500 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" : "text-gray-900 dark:text-white"
                        )}
                        disabled={isLoading}
                    />
                    
                    <div className="absolute right-2 flex items-center gap-1">
                        <button 
                            type="button"
                            onClick={toggleListening}
                            className={clsx(
                                "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
                                isListening 
                                    ? "bg-red-500 text-white animate-pulse" 
                                    : "text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-indigo-500 dark:hover:text-indigo-400"
                            )}
                            title="Voice Input"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </button>

                        <button 
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-md shadow-indigo-500/20"
                        >
                            <svg className="w-4 h-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </div>
                </form>
                <div className="text-center mt-3">
                    <p className="text-[10px] text-gray-400 dark:text-[var(--muted)]">Vero is an AI assistant and may occasionally make mistakes. Verify important financial data.</p>
                </div>
            </div>
        </div>
    );
}
