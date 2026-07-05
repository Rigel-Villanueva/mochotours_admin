'use client';

import { AuthGuard } from '@/features/auth-guard';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/widgets/admin-sidebar';
import { Menu, ChevronRight, Home, ExternalLink, CreditCard, CheckCircle, Clock, AlertTriangle, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/shared/api/apiClient';
import { ADMIN_PAGOS_API } from '@/shared/config/api-endpoints';
import { useAuth } from '@/entities/user';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
  '/admin/pagos': 'Pagos',
};

// ── Helpers ───────────────────────────────────────────────────────────

type PagoActual = { id: number; fecha_pago: string; pagado: boolean };

/** Parsea una fecha ISO/date sin desfase de zona horaria */
function parseFechaLocal(dateStr: string): Date {
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatFecha(dateStr: string): string {
  return format(parseFechaLocal(dateStr), "dd 'de' MMMM yyyy", { locale: es });
}

// ── Pill indicador de pago ────────────────────────────────────────────

function PaymentStatusPill({ pago }: { pago: PagoActual | null }) {
  if (!pago) return null;

  const fechaExacta = formatFecha(pago.fecha_pago);

  return (
    <Link
      href="/admin/pagos"
      className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
        pago.pagado
          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 animate-pulse'
      }`}
    >
      {pago.pagado ? <CheckCircle className="size-3.5" /> : <Clock className="size-3.5" />}
      <CreditCard className="size-3.5" />
      <span className="capitalize">
        {pago.pagado ? `Pagado: ${fechaExacta}` : `Pagar: ${fechaExacta}`}
      </span>
    </Link>
  );
}

// ── Bloqueo por pago vencido (solo admin normal) ──────────────────────

function PaymentBlocker({ pago }: { pago: PagoActual }) {
  const { logout } = useAuth();
  const fechaExacta = formatFecha(pago.fecha_pago);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-stone-900/70 backdrop-blur-lg"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.05 }}
          className="relative bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center overflow-hidden"
        >
          {/* Fondo decorativo rojo */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 to-rose-600 rounded-t-3xl" />

          {/* Ícono */}
          <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-rose-100 flex items-center justify-center">
            <AlertTriangle className="size-10 text-red-500" />
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-stone-900 mb-3">
            Acceso Suspendido
          </h2>

          <p className="text-stone-500 mb-2 leading-relaxed">
            Tu fecha de pago fue el{' '}
            <span className="font-black text-red-600 capitalize">{fechaExacta}</span>{' '}
            y aún no se ha registrado el pago.
          </p>

          <p className="text-stone-400 text-sm mb-10">
            Por favor realiza tu pago para continuar usando el sistema.
            Contacta a tu administrador si necesitas ayuda.
          </p>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-bold text-lg rounded-2xl transition-all shadow-lg shadow-red-200"
          >
            <LogOut className="size-5" />
            Cerrar Sesión
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Breadcrumbs ───────────────────────────────────────────────────────

function getBreadcrumbs(pathname: string) {
  if (pathname === '/admin') return [{ label: 'Dashboard', href: '/admin' }];

  const crumbs = [{ label: 'Admin', href: '/admin' }];

  if (BREADCRUMB_MAP[pathname]) {
    crumbs.push({ label: BREADCRUMB_MAP[pathname], href: pathname });
    return crumbs;
  }

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

// ── Layout principal ──────────────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);
  const { user } = useAuth();

  const [pagoActual, setPagoActual] = useState<PagoActual | null>(null);

  // Cargar el pago actual para todos los roles autenticados
  useEffect(() => {
    if (!user?.rol) return;
    apiClient
      .get<{ success: boolean; data: PagoActual }>(
        `${ADMIN_PAGOS_API}/actual`,
        undefined,
        true
      )
      .then((res) => setPagoActual(res.data))
      .catch(() => null);
  }, [user?.rol]);

  // ¿Debe mostrarse el bloqueador?
  // Solo para admins normales cuya fecha ya pasó y no han pagado
  const isAdmin = user?.rol === 'admin';
  const isBlocked = (() => {
    if (!isAdmin || !pagoActual) return false;
    if (pagoActual.pagado) return false;
    const fechaPago = parseFechaLocal(pagoActual.fecha_pago);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Comparar solo fecha, no hora
    return fechaPago < hoy;
  })();

  return (
    <AuthGuard>
      <div className="flex min-h-screen w-full overflow-x-hidden bg-stone-50">
        {/* Sidebar */}
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Contenido principal */}
        <div className="flex-1 lg:ml-[240px] flex flex-col min-h-screen w-full overflow-x-hidden">

          {/* ── Header Top ───────────────────────────────────────── */}
          <header className="sticky top-0 z-30 h-14 bg-white/80 backdrop-blur-md border-b border-stone-200/60 px-4 sm:px-6 flex items-center justify-between">
            {/* Izquierda: Hamburguesa + Breadcrumbs */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-stone-100 transition-colors"
                aria-label="Abrir menú"
              >
                <Menu className="size-5 text-stone-600" />
              </button>

              <nav className="hidden sm:flex items-center gap-1 text-sm">
                {breadcrumbs.map((crumb, idx) => (
                  <div key={crumb.href} className="flex items-center gap-1">
                    {idx === 0 && <Home className="w-3.5 h-3.5 text-stone-400 mr-0.5" />}
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-stone-300" />}
                    {idx === breadcrumbs.length - 1 ? (
                      <span className="text-stone-700 font-medium">{crumb.label}</span>
                    ) : (
                      <Link href={crumb.href} className="text-stone-400 hover:text-stone-600 transition-colors">
                        {crumb.label}
                      </Link>
                    )}
                  </div>
                ))}
              </nav>

              <span className="sm:hidden text-sm font-semibold text-stone-700">
                {breadcrumbs[breadcrumbs.length - 1]?.label || 'Admin'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Indicador de pago */}
              <PaymentStatusPill pago={pagoActual} />

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

          {/* ── Zona de contenido ────────────────────────────────── */}
          <main className="flex-1 overflow-x-hidden">
            <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* ── Bloqueador por pago vencido ──────────────────────────── */}
      {isBlocked && pagoActual && <PaymentBlocker pago={pagoActual} />}
    </AuthGuard>
  );
}
