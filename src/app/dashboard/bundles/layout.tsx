import HeroSection from '@/components/ui/HeroSection';

export default function ReceiptsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col flex-1">
            <HeroSection pageKey="receipts" />
            <div className="flex-1 w-full relative">
                {children}
            </div>
        </div>
    );
}
