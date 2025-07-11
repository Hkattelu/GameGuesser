/**
 * @fileoverview A utils file just for environment dependent utils. These get mocked in tests.
 */

// Backend base URL – configurable via Vite at build-time, falls back to localhost during development.
export const getApiUrl = () => {
  return import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8080';
};