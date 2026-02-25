import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || !payload.userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { theme } = body;

        if (!theme || (theme !== "light" && theme !== "dark")) {
            return new NextResponse("Invalid theme selection", { status: 400 });
        }

        await db.user.update({
            where: { id: payload.userId as string },
            data: { theme },
        });

        return NextResponse.json({ success: true, theme });
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
