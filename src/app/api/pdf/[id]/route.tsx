import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';
import chromium from '@sparticuz/chromium';
import puppeteerCore from 'puppeteer-core';
import { db } from '@/lib/db';

function generateReceiptHtml(receipt: any, business: any, tektriqLogoBase64: string) {
  // Helpers
  const formatMoney = (n: any) => Number(n).toFixed(2);
  const formatDate = (d: Date) => format(new Date(d), "MMMM d, yyyy");

  const itemsRows = receipt.items.map((item: any) => `
    <tr>
      <td class="py-4 text-sm text-gray-900">${item.description}</td>
      <td class="py-4 text-right text-sm text-[var(--muted)]">${item.quantity}</td>
      <td class="py-4 text-right text-sm text-[var(--muted)]">${formatMoney(item.unitPrice)}</td>
      <td class="py-4 text-right text-sm text-gray-900">${formatMoney(item.lineTotal)}</td>
    </tr>
  `).join('');

  // Use absolute URL or relative if served. Puppeteer can load external images if network enabled.
  // For local files, we might need file:// protocol or base64. 
  // Assuming logoPath is '/uploads/...' relative to public.
  // We can try using process.env.NEXT_PUBLIC_BASE_URL (http://localhost:3000) if available, or just the path for web view.
  // Since we rely on tailwind CDN, we assume networking is allowed.
  let logoSrc = (receipt.user as any)?.businessLogoPath || business.logoPath;
  if (logoSrc && !logoSrc.startsWith('http') && process.env.NEXT_PUBLIC_BASE_URL) {
    logoSrc = `${process.env.NEXT_PUBLIC_BASE_URL}${logoSrc}`;
  }
  const logoHtml = logoSrc ? `<img src="${logoSrc}" alt="Logo" class="h-12 w-auto object-contain mr-4" />` : '';

  const taxInfo = receipt.taxType !== 'none' ? `
  <div class="flex justify-between py-2">
         <span class="text-sm font-medium text-[var(--muted)]">
            Tax ${receipt.taxType === 'percent' ? `(${receipt.taxValue}%)` : '(Flat)'}
         </span>
         <span class="text-sm text-gray-900">
            ${formatMoney(Number(receipt.total) - Number(receipt.subtotal))}
         </span>
      </div>
  ` : '';
  const notesHtml = receipt.notes ? `
  <div class="mt-8 border-t border-gray-200 pt-8">
         <h4 class="text-sm font-medium text-[var(--muted)]">Notes</h4>
         <p class="mt-2 text-sm text-[var(--muted)]">${receipt.notes}</p>
      </div>
  ` : '';

  return `
  <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {margin: 20mm; }
            body {font-family: sans-serif; -webkit-print-color-adjust: exact; }
          </style>
      </head>
      <body>
        <div class="bg-white p-8 max-w-4xl mx-auto">
          <!-- Header -->
          <div class="flex justify-between items-start mb-8">
            <div class="flex items-start">
              ${logoHtml}
              <div>
                <h1 class="text-xl font-bold text-gray-900">
                  ${receipt.user?.businessName || receipt.user?.email?.split('@')[0] || business.businessName}
                </h1>
                ${receipt.user?.businessAddress || business.businessAddress ? `<p class="mt-1 text-sm text-[var(--muted)] whitespace-pre-wrap">${receipt.user?.businessAddress || business.businessAddress}</p>` : ''}
                ${receipt.user?.businessPhone || business.businessPhone ? `<p class="text-sm text-[var(--muted)]">${receipt.user?.businessPhone || business.businessPhone}</p>` : ''}
              </div>
            </div>
            <div class="text-right shrink-0 ml-4">
              <h2 class="text-xs uppercase tracking-widest text-[var(--muted)] font-bold mb-1">Receipt</h2>
              <p class="text-base sm:text-lg font-mono text-gray-900 whitespace-nowrap">#${receipt.receiptNumber}</p>
              <p class="text-sm text-[var(--muted)] mt-1 whitespace-nowrap">${formatDate(receipt.date)}</p>
            </div>
          </div>

          <!-- Client Info -->
          <div class="mt-8 border-t border-gray-200 pt-8 mb-8">
            <h3 class="text-sm font-medium text-[var(--muted)] uppercase tracking-wider">Bill To</h3>
            <div class="mt-2 text-lg text-gray-900">
              ${receipt.clientName || "Guest Client"}
            </div>
          </div>

          <!-- Items Table -->
          <div class="mt-8">
            <table class="min-w-full divide-y divide-gray-200">
              <thead>
                <tr class="border-b border-gray-200">
                  <th class="py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Item</th>
                  <th class="py-3 text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Qty</th>
                  <th class="py-3 text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Price</th>
                  <th class="py-3 text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                ${itemsRows}
              </tbody>
            </table>
          </div>

          <!-- Totals -->
          <div class="mt-8 border-t border-gray-200 pt-8 flex justify-end">
            <div class="w-1/2">
              <div class="flex justify-between py-2">
                <span class="text-sm font-medium text-[var(--muted)]">Subtotal</span>
                <span class="text-sm text-gray-900">${formatMoney(receipt.subtotal)}</span>
              </div>
              ${taxInfo}
              <div class="flex justify-between py-2 border-t border-gray-200 mt-2">
                <span class="text-base font-bold text-gray-900">Total</span>
                <span class="text-base font-bold text-gray-900">${formatMoney(receipt.total)}</span>
              </div>
            </div>
          </div>

          ${notesHtml}

          <!-- Footer -->
          <div class="mt-12 text-center border-t border-gray-100 pt-8">
            <p class="text-sm text-[var(--muted)] mb-4">Thank you for your business!</p>
            <div class="flex items-center justify-center gap-1.5 opacity-60 grayscale">
              <span class="text-[10px] uppercase tracking-wider text-[var(--muted)] font-medium">Verihub is powered by</span>
              <img src="data:image/png;base64,${tektriqLogoBase64}" alt="Tektriq LLC" class="h-3 w-auto object-contain" />
              <span class="text-[10px] uppercase tracking-wider text-[var(--muted)] font-bold">Tektriq LLC</span>
            </div>
          </div>
        </div>
      </body>
    </html>
`;
}

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    // Assuming 'db' is available, e.g., imported from '@/lib/db'
    // Replace getReceipt and getBusinessProfile with direct db calls
    const receipt = await db.receipt.findUnique({
      where: { id },
      include: {
        items: true,
        user: true,
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // Default or user's business text
    const businessName = receipt.user?.businessName || receipt.user?.name || receipt.user?.email || "Generated via Verihub Core";

    // Address splitting safely
    const businessAddressStr = receipt.user?.businessAddress || "123 Business Rd.\nSuite 400\nCity, ST 12345";
    const addressLines = businessAddressStr.split('\n');
    const addressLine1 = addressLines[0] || '';
    const addressLine2 = addressLines.slice(1).join(', ') || '';

    const businessPhone = receipt.user?.businessPhone || "+1 (555) 123-4567";

    const business = {
      name: businessName,
      addressLine1,
      addressLine2,
      phone: businessPhone,
      email: receipt.user?.email || "support@business.com",
      logoPath: (receipt.user as any)?.businessLogoPath || '' // Assuming logo path might come from user
    };

    // Attempt to load Tektriq logo as base64
    const logoPath = path.join(process.cwd(), 'public', 'tektriq-logo.png');
    let logoBase64 = '';
    try {
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = logoBuffer.toString('base64');
    } catch (e) {
      console.error("Failed to read tektriq logo", e);
    }

    const fullHtml = generateReceiptHtml(receipt, business, logoBase64);

    let browser;

    // Determine the environment and launch the appropriate Chromium binary
    if (process.env.NODE_ENV === 'production') {
      // Use sparticuz/chromium within Vercel's serverless size limits
      const executablePath = await chromium.executablePath();
      browser = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: chromium.headless === true ? true : 'new' as any,
      });
    } else {
      // Use standard full puppeteer locally
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    const page = await browser.newPage();
    // Use localhost:3000 base for assets if needed, but CDN is fine.
    // NOTE: Puppeteer loading local assets might be tricky.
    // If the image is at /uploads/foo.png and we just say src="/uploads/foo.png", puppeteer doesn't know the domain.
    // We should ideally use a full URL. For now, assuming deployment or local usage where user configures properly.
    await page.setContent(fullHtml, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename = "Verihub_${receipt.receiptNumber}.pdf"`,
      },
    });

  } catch (error) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
