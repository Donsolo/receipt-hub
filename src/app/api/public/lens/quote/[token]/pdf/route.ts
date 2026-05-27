import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { format } from 'date-fns';
import chromium from '@sparticuz/chromium';
import puppeteerCore from 'puppeteer-core';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function generateQuoteHtml(share: any, session: any) {
  const formatMoney = (n: any) => Number(n || 0).toFixed(2);
  const formatDate = (d: Date) => format(new Date(d), "MMMM d, yyyy");

  const business = session.user;
  const businessName = business?.businessName || business?.name || business?.email?.split('@')[0] || "Vero Lens Estimate";
  
  let logoSrc = business?.businessLogoPath;
  if (logoSrc && !logoSrc.startsWith('http') && process.env.NEXT_PUBLIC_BASE_URL) {
    logoSrc = `${process.env.NEXT_PUBLIC_BASE_URL}${logoSrc}`;
  }
  const logoHtml = logoSrc ? `<img src="${logoSrc}" alt="Logo" class="h-12 w-auto object-contain mr-4" />` : '';

  let activeVersion = null;
  if (session.activeVersionId) {
      activeVersion = session.versions.find((v: any) => v.id === session.activeVersionId);
  }

  const presentationData = activeVersion ? activeVersion.snapshotJson : {
      title: session.title,
      serviceCategory: session.serviceCategory,
      disclaimer: session.disclaimer,
      images: session.images,
      lineItems: session.lineItems
  };

  const lineItems = presentationData.lineItems || session.lineItems;
  const itemsRows = lineItems.map((item: any) => `
    <div class="grid grid-cols-12 gap-2 items-center py-3 border-b border-gray-100">
        <div class="col-span-6 text-sm text-gray-900 font-medium pr-2">
            <div>${item.title}</div>
            ${item.description ? `<div class="text-xs text-gray-500 mt-1 font-normal">${item.description}</div>` : ''}
        </div>
        <div class="col-span-2 text-center text-sm text-gray-500 tabular-nums">${item.quantity} ${item.unit || ''}</div>
        <div class="col-span-2 text-right text-sm text-gray-500 tabular-nums">${item.unitPrice ? formatMoney(item.unitPrice) : 'TBD'}</div>
        <div class="col-span-2 text-right text-sm text-gray-900 font-semibold tabular-nums">
            ${item.unitPrice ? formatMoney(item.quantity * item.unitPrice) : (item.estimatedPriceHigh ? `$${formatMoney(item.estimatedPriceLow)} - $${formatMoney(item.estimatedPriceHigh)}` : 'TBD')}
        </div>
    </div>
  `).join('');

  // Generate Image Canvases
  const images = presentationData.images || session.images;
  const imagesHtml = images.map((img: any) => {
      let anns: any[] = [];
      if (typeof img.annotations === 'string') {
          try { anns = JSON.parse(img.annotations); } catch(e){}
      } else if (Array.isArray(img.annotations)) {
          anns = img.annotations;
      }

      let annHtml = '';
      anns.forEach(a => {
          let style = `position: absolute; left: ${a.x*100}%; top: ${a.y*100}%; width: ${a.width*100}%; height: ${a.height*100}%; border: 2px solid ${a.color};`;
          if (a.type === 'circle') style += 'border-radius: 50%;';
          if (a.type === 'label') {
              style = `position: absolute; left: ${a.x*100}%; top: ${a.y*100}%; background: ${a.color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; width: auto; height: auto; border: none;`;
              annHtml += `<div style="${style}">${a.label || 'Text Label'}</div>`;
          } else if (a.type === 'arrow') {
              annHtml += `<div style="${style} border: none;"><svg width="100%" height="100%" preserveAspectRatio="none" style="overflow: visible;"><defs><marker id="arrowhead-${a.id}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${a.color}" /></marker></defs><line x1="0" y1="0" x2="100%" y2="100%" stroke="${a.color}" stroke-width="3" marker-end="url(#arrowhead-${a.id})" /></svg></div>`;
          } else {
              annHtml += `<div style="${style}"></div>`;
          }

          if (a.label && a.type !== 'label') {
              annHtml += `<div style="position: absolute; left: ${a.x*100}%; top: ${(a.y + a.height)*100}%; margin-top: 4px; background: rgba(0,0,0,0.8); color: white; font-size: 8px; padding: 2px 4px; border-radius: 2px; white-space: nowrap;">${a.label}</div>`;
          }
      });

      return `
        <div class="mb-8 page-break-inside-avoid">
            <div style="position: relative; width: 100%; max-width: 600px; margin: 0 auto; overflow: hidden; border-radius: 8px; background: #000;">
                <img src="${img.imageUrl}" style="width: 100%; display: block;" />
                ${annHtml}
            </div>
        </div>
      `;
  }).join('');

  // Grab approval if exists
  const approval = share.approvals?.[0];
  const approvalHtml = approval ? `
    <div class="mt-8 border-t border-gray-200 pt-8 page-break-inside-avoid">
        <h3 class="text-lg font-bold text-gray-900 mb-4">Customer Approval</h3>
        <p class="text-sm text-gray-600 mb-2"><strong>Name:</strong> ${approval.customerName || 'N/A'}</p>
        <p class="text-sm text-gray-600 mb-2"><strong>Status:</strong> ${approval.status}</p>
        <p class="text-sm text-gray-600 mb-4"><strong>Date:</strong> ${formatDate(approval.createdAt)}</p>
        ${approval.message ? `<p class="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded"><strong>Message:</strong> ${approval.message}</p>` : ''}
        ${approval.signatureDataUrl ? `
            <div class="mt-4">
                <p class="text-sm font-bold text-gray-900 mb-2">Signature:</p>
                <img src="${approval.signatureDataUrl}" alt="Signature" class="h-24 object-contain border-b border-gray-300 inline-block" />
            </div>
        ` : ''}
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
            .page-break-inside-avoid { page-break-inside: avoid; }
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
                  ${businessName}
                </h1>
                ${business?.businessAddress ? `<p class="mt-1 text-sm text-[var(--muted)] whitespace-pre-wrap">${business.businessAddress}</p>` : ''}
                ${business?.businessPhone ? `<p class="text-sm text-[var(--muted)]">${business.businessPhone}</p>` : ''}
              </div>
            </div>
            <div class="text-right shrink-0 ml-4">
              <h2 class="text-xs uppercase tracking-widest text-[var(--muted)] font-bold mb-1">Quote Estimate</h2>
              <p class="text-base sm:text-lg font-mono text-gray-900 whitespace-nowrap">#${session.id.substring(0, 8).toUpperCase()}</p>
              <p class="text-sm text-[var(--muted)] mt-1 whitespace-nowrap">${formatDate(share.createdAt)}</p>
              ${activeVersion ? `<p class="text-sm font-bold text-blue-600 mt-2">Version ${activeVersion.versionNumber}</p>` : ''}
            </div>
          </div>

          <div class="mb-8">
            <h2 class="text-lg font-bold text-gray-900 mb-2">${presentationData.metadata?.title || presentationData.title || session.title || 'Service Estimate'}</h2>
            ${presentationData.metadata?.serviceCategory || presentationData.serviceCategory ? `<p class="text-sm text-gray-500 uppercase tracking-wider mb-2">${(presentationData.metadata?.serviceCategory || presentationData.serviceCategory).replace('_', ' ')}</p>` : ''}
            ${activeVersion && activeVersion.changeSummary ? `<div class="bg-blue-50 text-blue-800 p-3 rounded-md text-sm"><strong>Revision:</strong> ${activeVersion.changeSummary}</div>` : ''}
          </div>

          <!-- Images -->
          ${imagesHtml}

          <!-- Items Table -->
          <div class="mt-8">
            <h3 class="text-lg font-bold text-gray-900 mb-4">Estimated Scope of Work</h3>
            <div class="grid grid-cols-12 gap-2 pb-3 border-b border-gray-200 items-center">
                <div class="col-span-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item</div>
                <div class="col-span-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</div>
                <div class="col-span-2 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Unit Price</div>
                <div class="col-span-2 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Estimated Total</div>
            </div>
            <div class="divide-y divide-gray-100">
                ${itemsRows}
            </div>
          </div>

          ${presentationData.metadata?.disclaimer || presentationData.disclaimer || session.disclaimer ? `
            <div class="mt-8 bg-gray-50 p-4 rounded-xl text-sm text-gray-600">
                <strong>Disclaimer:</strong> ${presentationData.metadata?.disclaimer || presentationData.disclaimer || session.disclaimer}
            </div>
          ` : ''}

          <!-- Approvals -->
          ${approvalHtml}

          <!-- Footer -->
          <div class="mt-12 text-center border-t border-gray-100 pt-8">
            <div class="flex items-center justify-center gap-1.5 opacity-60 grayscale">
              <span class="text-[10px] uppercase tracking-wider text-[var(--muted)] font-bold">Powered by Vero AI</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function GET(
  request: Request,
  context: any
) {
  try {
    const { token } = await Promise.resolve(context.params);

    const share = await db.veroLensShare.findUnique({
      where: { token },
      include: {
        approvals: { orderBy: { createdAt: 'desc' }, take: 1 },
        session: {
          include: {
            images: true,
            lineItems: { where: { quantity: { gt: 0 } }, orderBy: { sortOrder: 'asc' } },
            user: true,
            versions: true
          }
        }
      }
    });

    if (!share || share.status === 'REVOKED') {
      return new NextResponse('Invalid or Revoked Link', { status: 404 });
    }

    const fullHtml = generateQuoteHtml(share, share.session);

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
    
    // Wait for networkidle0 so images load
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
        'Content-Disposition': `inline; filename="Quote_${share.session.id.substring(0, 8)}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Lens PDF Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
