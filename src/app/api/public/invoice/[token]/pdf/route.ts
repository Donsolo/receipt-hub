import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import puppeteerCore from 'puppeteer-core';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const resolvedParams = await params;
        const token = resolvedParams.token;
        if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

        // Verify the invoice exists
        const invoice = await db.invoice.findUnique({
            where: { publicToken: token },
            select: { id: true }
        });

        if (!invoice) {
            return NextResponse.json({ error: "Invoice not found or link expired" }, { status: 404 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const targetUrl = `${baseUrl}/invoice/${token}`;

        let browser;

        if (process.env.NODE_ENV === 'production') {
            const executablePath = await chromium.executablePath();
            browser = await puppeteerCore.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: executablePath,
                headless: chromium.headless as any,
            });
        } else {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        }

        const page = await browser.newPage();
        
        // Emulate print media type to strip background UI
        await page.emulateMediaType('print');

        await page.goto(targetUrl, {
            waitUntil: 'networkidle2',
            timeout: 15000
        });

        // Add a slight delay to ensure all React hydration and canvas drawings complete
        await new Promise(r => setTimeout(r, 1500));

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm'
            }
        });

        await browser.close();

        return new NextResponse(Buffer.from(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Invoice_${invoice.id.split('-')[0]}.pdf"`,
            },
        });

    } catch (error: any) {
        console.error("Invoice PDF Generation Error:", error);
        return NextResponse.json({ error: "Failed to generate Invoice PDF" }, { status: 500 });
    }
}
