/**
 * All environment-driven configuration in one place.
 * Values come from .env (see .env.example).
 */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

/** Backend base URL. Empty string → same-origin (use the Vite proxy or a reverse proxy). */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

export function apiUrl(path: string): string {
  return `${API_BASE_URL.replace(/\/$/, '')}${path}`;
}
