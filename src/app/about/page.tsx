import PageHeaderCard from '@/components/ui/PageHeaderCard';
import HeroSection from '@/components/ui/HeroSection';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-[var(--text)] relative">
            <HeroSection pageKey="about" />

            <div className="flex-1 w-full flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8">
                <div className="w-full max-w-4xl space-y-6 relative">
                    <PageHeaderCard title="About Verihub" description="Our mission and infrastructure design." />

                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 sm:p-8 shadow-sm">
                        <div className="prose prose-sm text-[var(--muted)]">
                            <p className="mb-4">
                                Verihub is an internal utility tool designed to streamline the creation and management of business receipts.
                                It provides a simple, consistent interface for generating professional documentation for client transactions.
                            </p>
                            <p className="mb-8">
                                Verihub is developed and maintained by <strong>Tektriq LLC</strong>, a United States-based software company focused on building modern web applications and business tools.
                            </p>

                            <div className="border-t border-[var(--border)] pt-6">
                                <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-widest mb-2">General Support</h3>
                                <a href="mailto:support@tektriq.com" className="text-blue-600 hover:text-blue-500 transition-colors">support@tektriq.com</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
