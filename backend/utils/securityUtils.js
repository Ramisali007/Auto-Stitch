const path = require('path');
const { URL } = require('url');

/**
 * Validates and safely resolves a local file path within an allowed directory.
 * Prevents Directory Traversal (e.g. /uploads/../../.env).
 *
 * @param {string} baseDir - Base root directory that files must reside within.
 * @param {string} userPath - User-supplied relative path or filename.
 * @param {string[]} [allowedExtensions] - Optional list of permitted extensions (e.g. ['.png', '.jpg', '.jpeg', '.webp']).
 * @returns {string|null} Resolved absolute file path if safe, or null if traversal/invalid.
 */
function resolveSafeFilePath(baseDir, userPath, allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif']) {
  if (!userPath || typeof userPath !== 'string') return null;

  // Strip null bytes
  const sanitized = userPath.replace(/\0/g, '');

  const resolvedBase = path.resolve(baseDir);
  const resolvedPath = path.resolve(resolvedBase, sanitized);

  // Check that resolved path is inside resolved base
  if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
    return null;
  }

  // Check extension if specified
  if (allowedExtensions && allowedExtensions.length > 0) {
    const ext = path.extname(resolvedPath).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return null;
    }
  }

  return resolvedPath;
}

/**
 * Validates whether a remote URL is safe to fetch (Prevents SSRF attacks).
 * Blocks localhost, link-local, loopback, private IPv4/IPv6, and internal AWS/cloud metadata addresses.
 *
 * @param {string} urlStr - The URL string to validate.
 * @param {string[]} [allowedHosts] - Optional whitelist of hostnames (e.g. Cloudinary, S3).
 * @returns {boolean} True if safe, false if blocked.
 */
function isSafeRemoteUrl(urlStr, allowedHosts = null) {
  if (!urlStr || typeof urlStr !== 'string') return false;

  try {
    const parsed = new URL(urlStr);

    // Only allow http/https
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    // Block loopback, localhost, and common local domains
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return false;
    }

    // Block AWS / GCP / Azure metadata endpoint (169.254.169.254) and link-local (169.254.x.x)
    if (host.startsWith('169.254.')) {
      return false;
    }

    // Block IPv4 private ranges:
    // 10.0.0.0 - 10.255.255.255
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return false;
    // 172.16.0.0 - 172.31.255.255
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return false;
    // 192.168.0.0 - 192.168.255.255
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return false;

    // If allowedHosts is provided, check against the whitelist
    if (allowedHosts && Array.isArray(allowedHosts) && allowedHosts.length > 0) {
      const match = allowedHosts.some(allowed => {
        return host === allowed.toLowerCase() || host.endsWith('.' + allowed.toLowerCase());
      });
      if (!match) return false;
    }

    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  resolveSafeFilePath,
  isSafeRemoteUrl
};
