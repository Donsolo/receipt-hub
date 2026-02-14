export default function TermsPage() {
    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Terms of Service</h1>
            <div className="prose prose-sm text-gray-500">
                <p className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <strong>Receipt Hub</strong> is owned and operated by <strong>Tektriq LLC</strong> (“Company”, “we”, “our”, or “us”), a limited liability company registered in the United States.
                </p>
                <p className="mb-4">
                    By using Receipt Hub, you agree that this tool is provided "as is" for internal business use.
                    It is intended solely for authorized personnel to generate receipt documentation.
                </p>
                <p className="mb-4">
                    Use of this tool must comply with company policies regarding data accuracy and financial reporting.
                    Misuse of this tool for fraudulent documentation is strictly prohibited.
                </p>
                <p className="mb-8">
                    Tektriq LLC reserves the right to modify or discontinue this utility at any time without notice.
                </p>

                <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-widest mb-2">Legal Contact</h3>
                    <a href="mailto:legal@tektriq.com" className="text-blue-600 hover:text-blue-800">legal@tektriq.com</a>
                </div>
            </div>
        </div>
    );
}
