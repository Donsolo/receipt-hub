import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const data = await request.formData();
        const file: File | null = data.get("file") as unknown as File;

        if (!file) {
            return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 });
        }

        // Validate type
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
            return NextResponse.json({ success: false, message: "Invalid file type. Only PNG, JPG, and WEBP allowed." }, { status: 400 });
        }

        // Validate size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ success: false, message: "File size exceeds 2MB limit." }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64String = `data:${file.type};base64,${buffer.toString('base64')}`;

        return NextResponse.json({ success: true, path: base64String });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
