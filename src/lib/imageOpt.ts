/**
 * Compresses and scales down an image file on the client-side using HTML5 Canvas.
 * Optimizes huge photos into lightweight WEBP strings to save database and network footprint natively.
 */
export async function compressToWebp(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.6): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Scale proportionally natively retaining ratios
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Unable to obtain canvas context"));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Convert payload cleanly down to minimized footprint WebP bloblike string format
                const dataUrl = canvas.toDataURL('image/webp', quality);
                resolve(dataUrl);
            };

            img.onerror = () => {
                reject(new Error("Failed to load image for compression"));
            };

            if (e.target?.result && typeof e.target.result === 'string') {
                img.src = e.target.result;
            } else {
                reject(new Error("File read error"));
            }
        };

        reader.onerror = () => reject(new Error("FileReader error"));
        reader.readAsDataURL(file);
    });
}
