export function requirePro(user: any) {
    const isPro = user?.plan === "PRO" && user?.planStatus !== "inactive";
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

    if (!user || (!isPro && !isAdmin)) {
        throw new Error("PRO_PLAN_REQUIRED");
    }
}
