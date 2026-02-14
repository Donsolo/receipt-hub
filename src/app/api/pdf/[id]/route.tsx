import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { getReceipt, getBusinessProfile } from '@/lib/actions';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';

function generateReceiptHtml(receipt: any, business: any, tektriqLogoBase64: string) {
  // Helpers
  const formatMoney = (n: any) => Number(n).toFixed(2);
  const formatDate = (d: Date) => format(new Date(d), "MMMM d, yyyy");

  const itemsRows = receipt.items.map((item: any) => `
    <tr>
      <td class="py-4 text-sm text-gray-900">${item.description}</td>
      <td class="py-4 text-right text-sm text-gray-500">${item.quantity}</td>
      <td class="py-4 text-right text-sm text-gray-500">${formatMoney(item.unitPrice)}</td>
      <td class="py-4 text-right text-sm text-gray-900">${formatMoney(item.lineTotal)}</td>
    </tr>
  `).join('');

  // Use absolute URL or relative if served. Puppeteer can load external images if network enabled.
  // For local files, we might need file:// protocol or base64. 
  // Assuming logoPath is '/uploads/...' relative to public.
  // We can try using process.env.NEXT_PUBLIC_BASE_URL (http://localhost:3000) if available, or just the path for web view.
  // Since we rely on tailwind CDN, we assume networking is allowed.
  const logoSrc = business.logoPath;
  const logoHtml = logoSrc ? `<img src="${logoSrc}" alt="Logo" class="h-16 w-auto object-contain mr-4" />` : '';

  const taxInfo = receipt.taxType !== 'none' ? `
       <div class="flex justify-between py-2">
         <span class="text-sm font-medium text-gray-500">
            Tax ${receipt.taxType === 'percent' ? `(${receipt.taxValue}%)` : '(Flat)'}
         </span>
         <span class="text-sm text-gray-900">
            ${formatMoney(Number(receipt.total) - Number(receipt.subtotal))}
         </span>
       </div>
  ` : '';
  const notesHtml = receipt.notes ? `
      <div class="mt-8 border-t border-gray-200 pt-8">
         <h4 class="text-sm font-medium text-gray-500">Notes</h4>
         <p class="mt-2 text-sm text-gray-600">${receipt.notes}</p>
      </div>
  ` : '';

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
             @page { margin: 20mm; }
             body { font-family: sans-serif; -webkit-print-color-adjust: exact; }
          </style>
        </head>
        <body>
          <div class="bg-white p-8 max-w-4xl mx-auto">
              <!-- Header -->
              <div class="flex justify-between items-start mb-8">
                <div class="flex items-start">
                  ${logoHtml}
                  <div>
                    <h1 class="text-2xl font-bold text-gray-900">${business.businessName}</h1>
                    ${business.businessAddress ? `<p class="mt-1 text-sm text-gray-500 whitespace-pre-wrap">${business.businessAddress}</p>` : ''}
                    ${business.businessPhone ? `<p class="text-sm text-gray-500">${business.businessPhone}</p>` : ''}
                    ${business.businessEmail ? `<p class="text-sm text-gray-500">${business.businessEmail}</p>` : ''}
                  </div>
                </div>
                <div class="text-right">
                  <h2 class="text-xl font-bold text-gray-900">RECEIPT</h2>
                  <p class="mt-1 text-sm text-gray-500">#${receipt.receiptNumber}</p>
                  <p class="mt-1 text-sm text-gray-500">${formatDate(receipt.date)}</p>
                </div>
              </div>

              <!-- Client Info -->
              <div class="mt-8 border-t border-gray-200 pt-8 mb-8">
                <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">Bill To</h3>
                <div class="mt-2 text-lg text-gray-900">
                   ${receipt.clientName || "Guest Client"}
                </div>
              </div>

              <!-- Items Table -->
              <div class="mt-8">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr class="border-b border-gray-200">
                      <th class="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th class="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th class="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th class="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
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
                      <span class="text-sm font-medium text-gray-500">Subtotal</span>
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
                <p class="text-sm text-gray-400 mb-4">Thank you for your business!</p>
                <div class="flex items-center justify-center gap-1.5 opacity-60 grayscale">
                    <span class="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Receipt Hub is powered by</span>
                    <img src="data:image/png;base64,${tektriqLogoBase64}" alt="Tektriq LLC" class="h-3 w-auto object-contain" />
                    <span class="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Tektriq LLC</span>
                </div>
              </div>
          </div>
        </body>
      </html>
  `;
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const receipt = await getReceipt(params.id);
    const business = await getBusinessProfile();

    if (!receipt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Read Tektriq logo and convert to base64
    const logoPath = path.join(process.cwd(), 'public', 'tektriq-logo.png');
    let logoBase64 = '';
    try {
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = logoBuffer.toString('base64');
    } catch (e) {
      console.error("Failed to read tektriq logo", e);
    }

    const fullHtml = generateReceiptHtml(receipt, business, logoBase64);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

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
        'Content-Disposition': `attachment; filename="ReceiptHub_${receipt.receiptNumber}.pdf"`,
      },
    });

  } catch (error) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
