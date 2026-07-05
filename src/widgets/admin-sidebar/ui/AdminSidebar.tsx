'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, FolderOpen, Phone, X, LogOut, ChevronUp, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/entities/user';
import { ROUTES } from '@/shared/config/routes';
import { apiClient } from '@/shared/api/apiClient';
import { AUTH_PROFILE } from '@/shared/config/api-endpoints';
import { useState, useEffect } from 'react';

// ── Navegación agrupada ─────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Inicio',
    items: [
      { label: 'Dashboard', href: ROUTES.ADMIN, icon: LayoutDashboard },
    ],
  },
  {
    label: 'Contenido',
    items: [
      { label: 'Sitio Web', href: ROUTES.ADMIN_CONTENT, icon: FileText },
      { label: 'Álbumes', href: ROUTES.ADMIN_ALBUMS, icon: FolderOpen },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { label: 'Contacto', href: ROUTES.ADMIN_CONTACT, icon: Phone },
    ],
  },
  {
    label: 'Administración VIP',
    items: [
      { label: 'Pagos', href: ROUTES.ADMIN_PAGOS, icon: CreditCard, requireSuperadmin: true },
    ],
  },
];

// ── Props ───────────────────────────────────────────────────────────

type AdminSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

// ── Componente ──────────────────────────────────────────────────────

/**
 * Sidebar del panel de administración.
 *
 * DESKTOP: fijo a la izquierda (240px), siempre visible.
 * MÓVIL: oculto por defecto, se abre con botón hamburguesa (overlay).
 */
export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [displayName, setDisplayName] = useState('Administrador');

  // Fetch admin profile name
  useEffect(() => {
    apiClient.get<{ success: boolean; data: { nombre?: string } }>(
      AUTH_PROFILE,
      undefined,
      true
    ).then((res) => {
      const name = res.data?.nombre;
      if (name) setDisplayName(name);
    }).catch(() => {
      // Fallback to 'Administrador'
    });
  }, []);

  function isActive(href: string): boolean {
    if (href === ROUTES.ADMIN) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  // Obtener la inicial del nombre real
  const userInitial = displayName.charAt(0).toUpperCase();
  const userEmail = user?.email || 'admin@mochotours.com';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-stone-200">
      {/* ── Logo ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-stone-100">
        <Link href={ROUTES.ADMIN} onClick={onClose}>
          <Image
            src="/logo.png"
            alt="Mochotours Logo"
            width={140}
            height={40}
            className="h-9 w-auto"
            style={{ width: 'auto', height: '100%' }}
            priority
          />
        </Link>

        {/* Botón cerrar — solo móvil */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          aria-label="Cerrar menú"
        >
          <X className="size-5 text-stone-500" />
        </button>
      </div>

      {/* ── Navegación agrupada ─────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          // Filtramos los items basándonos en si requieren superadmin
          const filteredItems = group.items.filter((item) => {
            if (('requireSuperadmin' in item) && item.requireSuperadmin) {
              return user?.rol === 'superadmin';
            }
            return true;
          });

          if (filteredItems.length === 0) return null;

          return (
            <div key={group.label}>
            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold px-3 mb-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {filteredItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                      ${
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                      }
                    `}
                  >
                    {active && (
                      <span className="absolute left-0 w-[3px] h-6 rounded-r-full bg-primary" />
                    )}
                    <Icon className={`size-[18px] ${active ? 'text-primary' : 'text-stone-400'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {/* ── Usuario + Logout ─────────────────────────────────── */}
      <div className="px-3 py-3 border-t border-stone-100">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-stone-50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-full bg-stone-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-800 truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-stone-400 truncate">
                {userEmail}
              </p>
            </div>
            <ChevronUp className={`w-4 h-4 text-stone-400 transition-transform duration-200 flex-shrink-0 ${showUserMenu ? '' : 'rotate-180'}`} />
          </button>

          {/* Mini menú de usuario */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl border border-stone-200 shadow-lg overflow-hidden z-50"
              >
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-stone-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="size-4" />
                  Cerrar sesión
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop: sidebar fijo ──────────────────────────── */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="hidden lg:flex lg:flex-col lg:w-[240px] lg:fixed lg:inset-y-0 lg:left-0 lg:z-40"
      >
        {sidebarContent}
      </motion.aside>

      {/* ── Móvil: sidebar con overlay ─────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Fondo oscuro */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            />

            {/* Sidebar deslizante */}
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 left-0 z-50 w-[240px] lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
