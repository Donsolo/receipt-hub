export default function TermsPage() {
    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-2xl font-bold text-[var(--text)] mb-6">Terms of Service</h1>
            <div className="prose prose-sm text-[var(--text)]">
                <p className="mb-4 bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
                    <strong>Verihub</strong> is owned and operated by <strong>Tektriq LLC</strong> (“Company”, “we”, “our”, or “us”), a limited liability company registered in the United States.
                </p>
                <p className="mb-4">
                    By using Verihub, you agree that this tool is provided "as is" for internal business use.
                    It is intended solely for authorized personnel to generate receipt documentation.
                </p>
                <p className="mb-4">
                    Use of this tool must comply with company policies regarding data accuracy and financial reporting.
                    Misuse of this tool for fraudulent documentation is strictly prohibited.
                </p>
                <p className="mb-8">
                    Tektriq LLC reserves the right to modify or discontinue this utility at any time without notice.
                </p>

                <div className="mb-10 p-5 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                    <h3 className="text-lg font-bold text-red-900 dark:text-red-400 mb-2">Account & Data Deletion</h3>
                    <p className="text-sm text-red-800 dark:text-red-300 mb-3">
                        You have the right to request the complete deletion of your account and all associated data from Verihub.
                    </p>
                    <a href="/data-deletion" className="inline-flex items-center text-sm font-semibold text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                        View Data Deletion Policy &rarr;
                    </a>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                    <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-widest mb-2">Legal Contact</h3>
                    <a href="mailto:legal@tektriq.com" className="text-blue-600 hover:text-blue-800">legal@tektriq.com</a>
                </div>
            </div>
        </div>
    );
}
