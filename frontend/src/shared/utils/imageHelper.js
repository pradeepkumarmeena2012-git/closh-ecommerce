/**
 * Compresses an image file before uploading to reduce payload size.
 * Uses a Canvas to resize and compress.
 * 
 * @param {File|string} source - File object or Base64 string
 * @param {object} options - Compression options
 * @returns {Promise<string>} - Compressed Base64 string
 */
export const compressImage = async (source, { maxWidth = 1200, maxHeight = 1200, quality = 0.7 } = {}) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to JPEG for best size/quality ratio
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
        };

        img.onerror = (err) => {
            console.error("Compression error:", err);
            reject(err);
        };

        if (typeof source === 'string') {
            img.src = source;
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(source);
        }
    });
};
