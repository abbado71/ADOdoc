/**
 * Utility to optimize and downscale images before embedding into documents.
 * iPhone camera photos are typically 12-48MP (3MB-15MB uncompressed base64),
 * which immediately blows past localStorage limits (5MB) and degrades performance.
 *
 * This downscales images to a crisp high-DPI web resolution (max 1400px)
 * and applies high-quality JPEG/PNG compression (~100KB-200KB payload).
 */

export async function optimizeImageFile(
  file: File,
  maxDimension = 1400,
  quality = 0.82
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Il file selezionato non è un\'immagine valida.');
  }

  // SVG images are already vectors and lightweight
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Errore durante la lettura del file SVG'));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Scale down proportionally if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          fallbackFileReader(file, resolve);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);

        // Check if PNG has alpha transparency
        let mimeType = 'image/jpeg';
        if (file.type === 'image/png') {
          try {
            const sampleData = ctx.getImageData(0, 0, Math.min(width, 30), Math.min(height, 30)).data;
            let hasTransparency = false;
            for (let i = 3; i < sampleData.length; i += 4) {
              if (sampleData[i] < 250) {
                hasTransparency = true;
                break;
              }
            }
            if (hasTransparency) {
              mimeType = 'image/png';
            }
          } catch {
            mimeType = 'image/jpeg';
          }
        }

        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      } catch (err) {
        console.warn('Canvas optimization warning, using fallback reader:', err);
        URL.revokeObjectURL(objectUrl);
        fallbackFileReader(file, resolve);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      fallbackFileReader(file, resolve);
    };

    img.src = objectUrl;
  });
}

function fallbackFileReader(file: File, resolve: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    resolve((e.target?.result as string) || '');
  };
  reader.onerror = () => {
    resolve('');
  };
  reader.readAsDataURL(file);
}
