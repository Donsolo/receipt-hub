import { getFeatureFlags } from "@/lib/featureFlags";

export function useFeatures(user: any) {
    return getFeatureFlags(user);
}
