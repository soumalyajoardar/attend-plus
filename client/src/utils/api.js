// Production URL is set via VITE_API_BASE in the build environment.
// Falls back to localhost:5000 so local development works out-of-the-box
// without touching source code.
export const API_BASE =
  import.meta.env.VITE_API_BASE || 'https://www.attend-plus.onrender.com';
