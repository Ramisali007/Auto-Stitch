/**
 * Centralized API Configuration
 * All API calls should use API_URL instead of hardcoded localhost URLs.
 */
const API_URL = import.meta.env.VITE_API_URL || 'https://auto-stitch.onrender.com';
export default API_URL;
