/**
 * Rutas del backend (API REST).
 * Coinciden 1:1 con la Documentación de Endpoints del backend.
 */

// ── Auth ────────────────────────────────────────────────────────────
export const AUTH_LOGIN   = '/api/auth/login';
export const AUTH_REFRESH = '/api/auth/refresh';

// ── Galería ─────────────────────────────────────────────────────────
export const GALLERY = '/api/galeria';
export const GALLERY_BY_ID = (id: string) => `/api/galeria/${id}`;

// ── Álbumes ─────────────────────────────────────────────────────────
export const ALBUMS = '/api/albumes';
export const ALBUM_BY_ID = (id: string) => `/api/albumes/${id}`;
export const ALBUM_BY_SLUG = (slug: string) => `/api/albumes/slug/${slug}`;

// ── Contenido del sitio web ─────────────────────────────────────────
export const SITE_CONTENT = '/api/site-content';
export const SITE_CONTENT_BY_SECTION = (seccion: string) =>
  `/api/site-content/${seccion}`;

// ── Perfil del Admin ────────────────────────────────────────────────
export const AUTH_PROFILE = '/api/auth/profile';

// ── Activity Log ────────────────────────────────────────────────────
export const ADMIN_ACTIVITY = '/api/admin/activity';

// ── Health ──────────────────────────────────────────────────────────
export const HEALTH = '/health';

// ── Pagos ───────────────────────────────────────────────────────────
export const ADMIN_PAGOS_API = '/api/admin/pagos';
export const ADMIN_PAGOS_FECHA = (id: number) => `/api/admin/pagos/${id}/fecha`;
export const ADMIN_PAGOS_PAGAR = (id: number) => `/api/admin/pagos/${id}/pagar`;
