const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateOGImage() {
    const width = 1200;
    const height = 630;

    const iconPath = path.join(__dirname, '..', 'Verihub icon logo.png');
    const outDir = path.join(__dirname, '..', 'public', 'og');
    const outPath = path.join(outDir, 'verihub-og.png');

    // Ensure target directory exists natively
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    // Clean, minimal 120px icon centered horizontally at the top portion
    const iconSize = 120;
    const iconBuffer = await sharp(iconPath).resize(iconSize, iconSize).toBuffer();
    const leftPos = Math.floor((width - iconSize) / 2);
    const topPos = 130;

    // Render purely minimal typography strictly using the system sans stack
    const svgText = `
    <svg width="${width}" height="${height}">
      <style>
        .wordmark { 
            fill: #ffffff; 
            font-size: 80px; 
            font-weight: 700; 
            font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            letter-spacing: -2.5px;
        }
        .subheadline { 
            fill: #F8FAFC; 
            font-size: 38px; 
            font-weight: 600; 
            font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            letter-spacing: -0.5px;
        }
        .supporting {
            fill: #94A3B8;
            font-size: 24px;
            font-weight: 500;
            font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            letter-spacing: 0.2px;
        }
        .cta {
            fill: #64748B;
            font-size: 20px;
            font-weight: 500;
            font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
      </style>
      
      <!-- Center Aligned Text Cluster -->
      <g transform="translate(600, 310)">
        <text x="0" y="0" text-anchor="middle" class="wordmark">Verihub</text>
        <text x="0" y="65" text-anchor="middle" class="subheadline">Secure Receipt Intelligence</text>
        <text x="0" y="115" text-anchor="middle" class="supporting">Audit-Ready Infrastructure for Modern Businesses</text>
      </g>
      
      <!-- CTA Anchor Bottom Right -->
      <text x="1140" y="580" text-anchor="end" class="cta">Explore Verihub →</text>
    </svg>
  `;

    // Deep SaaS Navy Background (#0F172A)
    await sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { r: 15, g: 23, b: 42, alpha: 1 }
        }
    })
        .composite([
            { input: iconBuffer, top: topPos, left: leftPos },
            { input: Buffer.from(svgText), top: 0, left: 0 }
        ])
        .png()
        .toFile(outPath);

    console.log("Successfully generated /public/og/verihub-og.png");
}

generateOGImage().catch(err => {
    console.error("Failed to generate OG Image:", err);
    process.exit(1);
});
