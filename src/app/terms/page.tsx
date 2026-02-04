export default function TermsPage() {
    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Terms of Service</h1>
            <div className="prose prose-sm text-gray-500">
                <p className="mb-4">
                    By using Receipt Hub, you agree that this tool is provided "as is" for internal business use.
                    It is intended solely for authorized personnel to generate receipt documentation.
                </p>
                <p className="mb-4">
                    Use of this tool must comply with company policies regarding data accuracy and financial reporting.
                    Misuse of this tool for fraudulent documentation is strictly prohibited.
                </p>
                <p>
                    Tektriq reserves the right to modify or discontinue this utility at any time without notice.
                </p>
            </div>
        </div>
    );
}
