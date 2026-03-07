import HeroSection from '@/components/ui/HeroSection';

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col min-h-screen bg-[var(--bg)]">
            <HeroSection pageKey="feedback" />
            <div className="flex-1 w-full relative">
                {children}
            </div>
        </div>
    );
}
