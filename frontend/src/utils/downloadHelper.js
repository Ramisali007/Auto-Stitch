import API_URL from '../config/api';

/**
 * Trigger immediate device file download from a Blob URL.
 * Guarantees direct save to device without opening in a new tab/window.
 */
function triggerBlobDownload(blobUrl, filename) {
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Clean up DOM and revoke Blob URL after short delay
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    window.URL.revokeObjectURL(blobUrl);
  }, 1000);
}

/**
 * Downloads an image directly to the user's local device filesystem.
 * Handles data URIs, CORS-enabled assets, remote CDN/S3 URLs, and cross-origin security policies.
 *
 * @param {string} imageUrl - The source URL or data URI of the image
 * @param {string} [filename] - Desired filename for the saved file
 * @returns {Promise<boolean>} - Resolves true on successful download trigger
 */
export async function downloadImageDirectly(imageUrl, filename) {
  if (!imageUrl) return false;

  const resolvedFilename = filename || `auto-stitch-tryon-${Date.now()}.png`;

  // 1. Data URI handling (instant in-memory blob)
  if (imageUrl.startsWith('data:image/')) {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      triggerBlobDownload(blobUrl, resolvedFilename);
      return true;
    } catch (err) {
      console.warn('[Download] Failed to convert data URI to blob:', err);
    }
  }

  // 2. Direct Blob Fetch (works for same-origin and CORS-enabled assets)
  try {
    const res = await fetch(imageUrl, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      triggerBlobDownload(blobUrl, resolvedFilename);
      return true;
    }
  } catch (err) {
    console.warn('[Download] Direct CORS fetch failed, trying backend download attachment stream:', err);
  }

  // 3. Backend Download Proxy (Forces Content-Disposition: attachment header)
  try {
    const proxyUrl = `${API_URL}/api/vto/download?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(resolvedFilename)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      triggerBlobDownload(blobUrl, resolvedFilename);
      return true;
    }
  } catch (err) {
    console.warn('[Download] Backend proxy fetch failed, trying canvas fallback:', err);
  }

  // 4. In-Browser Canvas Rasterization Fallback
  try {
    const success = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const blobUrl = window.URL.createObjectURL(blob);
              triggerBlobDownload(blobUrl, resolvedFilename);
              resolve(true);
            } else {
              resolve(false);
            }
          }, 'image/png', 1.0);
        } catch (_) {
          resolve(false);
        }
      };
      img.onerror = () => resolve(false);
      img.src = imageUrl;
    });

    if (success) return true;
  } catch (err) {
    console.warn('[Download] Canvas rasterization failed:', err);
  }

  // 5. Hidden IFrame Stream Fallback (triggers browser download prompt directly without navigation)
  try {
    const proxyUrl = `${API_URL}/api/vto/download?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(resolvedFilename)}`;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = proxyUrl;
    document.body.appendChild(iframe);
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 5000);
    return true;
  } catch (err) {
    console.error('[Download] All download strategies failed:', err);
    return false;
  }
}
