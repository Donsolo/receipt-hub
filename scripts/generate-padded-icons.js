const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generatePwaIcons() {
    const inputIcon = path.join(__dirname, '..', 'Verihub icon logo.png');
    const iconsDir = path.join(__dirname, '..', 'public', 'icons');

    if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir, { recursive: true });
    }

    const sizes = [192, 256, 384, 512];

    for (const size of sizes) {
        const outPath = path.join(iconsDir, `icon-${size}x${size}.png`);

        // Calculate the inner icon size (e.g., 75% of the total size)
        // This provides 12.5% padding on all sides, protecting against Android's maskable squircle cuts.
        const innerSize = Math.floor(size * 0.75);

        // Resize the icon preserving aspect ratio and transparency
        const resizedBuffer = await sharp(inputIcon)
            .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer();

        // Create the final bounding box container (transparent)
        await sharp({
            create: {
                width: size,
                height: size,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 } // transparent
            }
        })
            .composite([
                {
                    input: resizedBuffer,
                    gravity: 'center'
                }
            ])
            .png()
            .toFile(outPath);

        console.log(`Successfully generated padded PWA icon: icon-${size}x${size}.png`);
    }

    // Also regenerate apple-touch-icon slightly padded (often needs a solid background to look correct on iOS)
    const appleSize = 180;
    const appleInner = Math.floor(appleSize * 0.80);
    const appleBuffer = await sharp(inputIcon)
        .resize(appleInner, appleInner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();

    // iOS Springboard requires a background for its touch icons, so we use #0F172A
    await sharp({
        create: {
            width: appleSize,
            height: appleSize,
            channels: 4,
            background: { r: 15, g: 23, b: 42, alpha: 1 } // #0F172A
        }
    })
        .composite([
            {
                input: appleBuffer,
                gravity: 'center'
            }
        ])
        .png()
        .toFile(path.join(iconsDir, 'apple-touch-icon.png'));

    console.log(`Successfully generated padded apple-touch-icon.png`);

    // Additionally, generate a padded pwa-icon.png for the install prompt component
    const promptSize = 192;
    const promptInner = Math.floor(promptSize * 0.85);
    const promptBuffer = await sharp(inputIcon)
        .resize(promptInner, promptInner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();

    await sharp({
        create: {
            width: promptSize,
            height: promptSize,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
        .composite([
            {
                input: promptBuffer,
                gravity: 'center'
            }
        ])
        .png()
        .toFile(path.join(__dirname, '..', 'public', 'pwa-icon.png'));

    console.log(`Successfully generated padded pwa-icon.png`);
}

generatePwaIcons().catch(console.error);
