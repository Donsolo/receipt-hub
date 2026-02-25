export function getFeatureFlags(user: any) {
    const isPro = user?.plan === "PRO" && user?.planStatus !== "inactive";
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
    const hasAccess = isPro || isAdmin;

    return {
        branding: hasAccess,
        ocr: hasAccess,
        smartCategories: hasAccess,
        reports: hasAccess,
        clientManager: hasAccess,
    };
}
