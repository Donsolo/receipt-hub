export default function AboutLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col min-h-screen bg-[var(--bg)]">
            <div className="flex-1 w-full relative">
                {children}
            </div>
        </div>
    );
}
