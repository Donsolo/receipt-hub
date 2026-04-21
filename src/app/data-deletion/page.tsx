import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Account & Data Deletion | Verihub",
    description: "Learn how to request the deletion of your account and associated data from Verihub.",
};

export default function DataDeletionPage() {
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
                    Account & Data Deletion
                </h1>
                <p className="mt-4 text-lg text-[var(--muted)]">
                    Information regarding your right to be forgotten and how to formally request data removal from Verihub.
                </p>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 mb-8">
                <div className="prose prose-blue max-w-none text-[var(--text)]">
                    <h2 className="text-xl font-bold text-[var(--text)] mt-0 mb-4">Your Right to Data Deletion</h2>
                    <p className="mb-6">
                        Under our internal policies and in compliance with global privacy standards including Google Play safety requirements, you have the absolute right to request the complete deletion of your Verihub account and all associated data.
                    </p>

                    <h3 className="text-lg font-semibold text-[var(--text)] mb-3">What data will be deleted?</h3>
                    <ul className="list-disc pl-5 mb-6 space-y-2 text-[var(--muted)]">
                        <li>Your user profile, email address, and authentication credentials.</li>
                        <li>All created receipts, invoice data, client records, and history.</li>
                        <li>Any uploaded business logos or receipt imagery.</li>
                        <li>Your custom system settings and metadata.</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-[var(--text)] mb-3">What happens after deletion?</h3>
                    <p className="mb-6 text-[var(--muted)]">
                        Once your deletion request is processed, it is permanent and irreversible. You will instantly lose access to your account, and any public links to invoices or receipts tied to your account will immediately become invalid.
                    </p>

                    <div className="mt-10 p-6 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                        <h3 className="text-lg font-bold text-red-900 dark:text-red-400 mb-2">How to Request Deletion</h3>
                        <p className="text-sm text-red-800 dark:text-red-300 mb-6 font-medium">
                            To initiate your account and data deletion, please contact our support team using the email address associated with your Verihub account.
                        </p>
                        
                        <a 
                            href="mailto:support@tektriq.com?subject=Account%20and%20Data%20Deletion%20Request&body=Hello,%20I%20would%20like%20to%20request%20the%20complete%20deletion%20of%20my%20Verihub%20account%20and%20all%20associated%20data.%20My%20account%20email%20is:%20[INSERT YOUR EMAIL]"
                            className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors w-full sm:w-auto"
                        >
                            Request Deletion (support@tektriq.com)
                        </a>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center text-sm font-medium">
                <Link href="/terms" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                    &larr; Back to Terms of Service
                </Link>
                <Link href="/privacy" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                    Privacy Policy &rarr;
                </Link>
            </div>
        </div>
    );
}
