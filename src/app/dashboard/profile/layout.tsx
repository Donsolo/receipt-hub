export default function ProfileLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col flex-1 min-h-screen bg-[var(--bg)]">
            {children}
        </div>
    );
}
