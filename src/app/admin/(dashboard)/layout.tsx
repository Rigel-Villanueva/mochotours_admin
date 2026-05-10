'use client';

import { AuthGuard } from '@/features/auth-guard';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/widgets/admin-sidebar';
import { Menu, ChevronRight, Home, ExternalLink } from 'lucide-react';

/**
 * Layout de las páginas protegidas del admin (dashboard).
 *
 * Todas las rutas dentro de /admin/(dashboard)/ pasan por AuthGuard:
 *   - /admin          → Dashboard
 *   - /admin/contenido → Gestión de contenido
 *   - /admin/galeria   → Gestión de galería
 *   - /admin/albumes   → Gestión de álbumes
 *   - /admin/contacto  → Información de contacto
 */

// Mapa de rutas a labels para breadcrumbs
const BREADCRUMB_MAP: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/contenido': 'Sitio Web',
  '/admin/galeria': 'Galería',
  '/admin/albumes': 'Álbumes',
  '/admin/contacto': 'Contacto',
};

function getBreadcrumbs(pathname: string) {
  // Ruta base
  if (pathname === '/admin') return [{ label: 'Dashboard', href: '/admin' }];

  const crumbs = [{ label: 'Admin', href: '/admin' }];

  // Buscar match exacto primero
  if (BREADCRUMB_MAP[pathname]) {
    crumbs.push({ label: BREADCRUMB_MAP[pathname], href: pathname });
    return crumbs;
  }

  // Si es una sub-ruta (e.g. /admin/albumes/xxx)
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 3) {
    const parentPath = `/${segments[0]}/${segments[1]}`;
    if (BREADCRUMB_MAP[parentPath]) {
      crumbs.push({ label: BREADCRUMB_MAP[parentPath], href: parentPath });
      crumbs.push({ label: 'Detalle', href: pathname });
    }
  }

  return crumbs;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <AuthGuard>
      <div className="flex min-h-screen w-full overflow-x-hidden bg-stone-50">
        {/* Sidebar */}
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Contenido principal — desplazado por el sidebar en desktop */}
        <div className="flex-1 lg:ml-[240px] flex flex-col min-h-screen w-full overflow-x-hidden">

          {/* ── Header Top ─────────────────────────────────────── */}
          <header className="sticky top-0 z-30 h-14 bg-white/80 backdrop-blur-md border-b border-stone-200/60 px-4 sm:px-6 flex items-center justify-between">
            {/* Izquierda: Hamburguesa + Breadcrumbs */}
            <div className="flex items-center gap-3">
              {/* Botón hamburguesa — solo móvil */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-stone-100 transition-colors"
                aria-label="Abrir menú"
              >
                <Menu className="size-5 text-stone-600" />
              </button>

              {/* Breadcrumbs */}
              <nav className="hidden sm:flex items-center gap-1 text-sm">
                {breadcrumbs.map((crumb, idx) => (
                  <div key={crumb.href} className="flex items-center gap-1">
                    {idx === 0 && <Home className="w-3.5 h-3.5 text-stone-400 mr-0.5" />}
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-stone-300" />}
                    {idx === breadcrumbs.length - 1 ? (
                      <span className="text-stone-700 font-medium">{crumb.label}</span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </div>
                ))}
              </nav>

              {/* Título en móvil */}
              <span className="sm:hidden text-sm font-semibold text-stone-700">
                {breadcrumbs[breadcrumbs.length - 1]?.label || 'Admin'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                target="_blank"
                className="hidden sm:flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-stone-100"
              >
                Ver sitio
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </header>

          {/* ── Zona de contenido ────────────────────────────── */}
          <main className="flex-1 overflow-x-hidden">
            <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
