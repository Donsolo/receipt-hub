export default function PrivacyPage() {
    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
            <div className="prose prose-sm text-gray-500">
                <p className="mb-4">
                    This Privacy Policy applies to the internal use of the Receipt Hub application.
                    As an internal utility, this application does not collect personal data from external users or share data with third parties.
                </p>
                <p className="mb-4">
                    Data stored within this application mimics standard business record-keeping practices.
                    Any client information entered is used solely for the purpose of generating receipt documentation.
                </p>
                <p>
                    For questions regarding data practices, please contact Tektriq administration.
                </p>
            </div>
        </div>
    );
}
