/**
 * Rutas del frontend (Next.js App Router).
 * Se usan en navegación, redirects y links activos del sidebar.
 */

export const ROUTES = {
  // ── Públicas ──────────────────────────────────────────────────────
  HOME: '/',
  GALLERY: '/galeria',
  GALLERY_ALBUM: (slug: string) => `/galeria/${slug}`,

  // ── Admin ─────────────────────────────────────────────────────────
  ADMIN: '/admin',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_CONTENT: '/admin/contenido',
  ADMIN_GALLERY: '/admin/galeria',
  ADMIN_ALBUMS: '/admin/albumes',
  ADMIN_ALBUM_DETAIL: (id: string) => `/admin/albumes/${id}`,
  ADMIN_CONTACT: '/admin/contacto',
  ADMIN_PAGOS: '/admin/pagos',
} as const;
