export default function PrivacyPage() {
    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-2xl font-bold text-gray-100 mb-6">Privacy Policy</h1>
            <div className="prose prose-sm text-gray-300">
                <p className="mb-4 bg-[#1F2937] p-4 rounded-lg border border-[#2D3748]">
                    <strong>Receipt Hub</strong> is a product of <strong>Tektriq LLC</strong>. Tektriq LLC respects your privacy and is committed to protecting your information.
                </p>
                <p className="mb-4">
                    This Privacy Policy applies to the internal use of the Receipt Hub application.
                    As an internal utility, this application does not collect personal data from external users or share data with third parties.
                </p>
                <p className="mb-8">
                    Data stored within this application mimics standard business record-keeping practices.
                    Any client information entered is used solely for the purpose of generating receipt documentation.
                </p>

                <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-widest mb-2">Legal Contact</h3>
                    <a href="mailto:legal@tektriq.com" className="text-blue-600 hover:text-blue-800">legal@tektriq.com</a>
                </div>
            </div>
        </div>
    );
}
