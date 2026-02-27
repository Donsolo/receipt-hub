const sharp = require('sharp');
const path = require('path');

async function generateOGImage() {
    const width = 1200;
    const height = 630;

    const iconPath = path.join(__dirname, '..', 'Verihub icon logo.png');
    const outPath = path.join(__dirname, '..', 'public', 'og-image.png');

    // Resize icon for header position
    const iconSize = 180;
    const iconBuffer = await sharp(iconPath).resize(iconSize, iconSize).toBuffer();

    // Calculate horizontal center
    const leftPos = Math.floor((width - iconSize) / 2);
    const topPos = 140;

    // Use pure SVG composition for extremely sharp text rendering
    const svgText = `
    <svg width="${width}" height="${height}">
      <style>
        .title { 
            fill: #ffffff; 
            font-size: 72px; 
            font-weight: 700; 
            font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            letter-spacing: -1px;
        }
        .tagline { 
            fill: #94A3B8; 
            font-size: 32px; 
            font-weight: 500; 
            font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            letter-spacing: 0.5px;
        }
      </style>
      <text x="50%" y="420" text-anchor="middle" class="title">Verihub</text>
      <text x="50%" y="480" text-anchor="middle" class="tagline">Secure Receipt Intelligence</text>
    </svg>
  `;

    await sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { r: 15, g: 23, b: 42, alpha: 1 } // Exact #0F172A
        }
    })
        .composite([
            { input: iconBuffer, top: topPos, left: leftPos },
            { input: Buffer.from(svgText), top: 0, left: 0 }
        ])
        .png()
        .toFile(outPath);

    console.log("Successfully generated /public/og-image.png");
}

generateOGImage().catch(err => {
    console.error("Failed to generate OG Image:", err);
    process.exit(1);
});
