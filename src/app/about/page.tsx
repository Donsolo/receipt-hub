export default function AboutPage() {
    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">About Receipt Hub</h1>
            <div className="prose prose-sm text-gray-500">
                <p className="mb-4">
                    Receipt Hub is an internal utility tool designed to streamline the creation and management of business receipts.
                    It provides a simple, consistent interface for generating professional documentation for client transactions.
                </p>
                <p className="mb-8">
                    Receipt Hub is developed and maintained by <strong>Tektriq LLC</strong>, a United States-based software company focused on building modern web applications and business tools.
                </p>

                <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-widest mb-2">General Support</h3>
                    <a href="mailto:support@tektriq.com" className="text-blue-600 hover:text-blue-800">support@tektriq.com</a>
                </div>
            </div>
        </div>
    );
}
