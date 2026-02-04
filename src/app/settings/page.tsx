import { getBusinessProfile } from "@/lib/actions";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const profile = await getBusinessProfile();

    return (
        <div className="space-y-6">
            <div className="pb-5 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Business Settings</h3>
                <p className="mt-2 max-w-4xl text-sm text-gray-500">
                    Manage your business details and logo. These will appear on all receipts.
                </p>
            </div>

            <SettingsForm initialData={profile} />
        </div>
    );
}
