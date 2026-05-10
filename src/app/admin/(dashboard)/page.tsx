'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/shared/api/apiClient';
import { GALLERY, ALBUMS, AUTH_PROFILE, ADMIN_ACTIVITY } from '@/shared/config/api-endpoints';
import { ROUTES } from '@/shared/config/routes';
import {
  ImageIcon, Film, FolderOpen, Settings2,
  Upload, FolderPlus, Pencil, ArrowRight,
  Loader2, TrendingUp, Clock, User,
  Save, X,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────

type DashboardStats = {
  totalFotos: number;
  totalVideos: number;
  totalAlbumes: number;
  loaded: boolean;
};

type AdminProfile = {
  nombre?: string;
  email?: string;
  rol?: string;
};

type ActivityItem = {
  id: string;
  action_type: string;
  action_description: string;
  entity_type?: string;
  created_at: string;
};

// ── Helpers ──────────────────────────────────────────────────────────

function formatDate(): string {
  const now = new Date();
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Devuelve un string de tiempo relativo, ej: "hace 2 horas" */
function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Justo ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;

  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

/** Mapea action_type a un ícono emoji para la lista de actividad */
function activityIcon(actionType: string): string {
  const map: Record<string, string> = {
    upload_photo: '📸',
    upload_video: '🎬',
    create_album: '📁',
    update_album: '✏️',
    delete_photo: '🗑️',
    delete_video: '🗑️',
    delete_album: '🗑️',
    update_content: '📝',
    update_contact: '📞',
    login: '🔐',
  };
  return map[actionType] || '📋';
}

// ── Stat Card ────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  value,
  label,
  trend,
  loading,
  iconBg = 'bg-primary/8',
  iconColor = 'text-primary',
}: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  trend?: string;
  loading?: boolean;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-stone-100 hover:shadow-md hover:border-stone-200 transition-all duration-200 group">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center ${iconColor} mb-3 group-hover:scale-105 transition-transform`}>
        <Icon className="h-5 w-5" />
      </div>
      {loading ? (
        <div className="flex items-center gap-2 mb-1">
          <Loader2 className="h-5 w-5 animate-spin text-stone-300" />
        </div>
      ) : (
        <div className="font-fraunces text-4xl text-stone-900 mb-1 tabular-nums">
          {value}
        </div>
      )}
      <p className="text-sm text-stone-500 mb-3">{label}</p>
      {trend && (
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-emerald-600" />
          <p className="text-xs text-emerald-600 font-medium">{trend}</p>
        </div>
      )}
    </div>
  );
}

// ── Quick Action ─────────────────────────────────────────────────────

function QuickAction({
  icon: Icon,
  label,
  description,
  href,
  primary,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        group flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5
        ${primary
          ? 'bg-primary text-white border-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20'
          : 'bg-white text-stone-800 border-stone-200 hover:border-primary/40 hover:shadow-md'
        }
      `}
    >
      <div className={`
        w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
        ${primary ? 'bg-white/20' : 'bg-primary/8 text-primary'}
      `}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${primary ? 'text-white' : 'text-stone-800'}`}>
          {label}
        </p>
        <p className={`text-xs mt-0.5 ${primary ? 'text-white/70' : 'text-stone-400'}`}>
          {description}
        </p>
      </div>
      <ArrowRight className={`h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-1 ${primary ? 'text-white/60' : 'text-stone-300'}`} />
    </Link>
  );
}

// ── Profile Edit Modal ──────────────────────────────────────────────

function ProfileEditModal({
  profile,
  onClose,
  onSave,
}: {
  profile: AdminProfile;
  onClose: () => void;
  onSave: (data: AdminProfile) => void;
}) {
  const [form, setForm] = useState({
    nombre: profile.nombre || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiClient.put<{ success: boolean; data: AdminProfile }>(
        AUTH_PROFILE,
        form,
        true
      );
      onSave(res.data);
      onClose();
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h3 className="text-lg font-semibold text-stone-800 font-fraunces">Editar perfil</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Nombre completo</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              placeholder="Tu nombre"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard Page ───────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalFotos: 0,
    totalVideos: 0,
    totalAlbumes: 0,
    loaded: false,
  });
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      // 1. Fetch Profile
      try {
        const res = await apiClient.get<{ success: boolean; data: AdminProfile }>(
          AUTH_PROFILE,
          undefined,
          true
        );
        setProfile(res.data);
      } catch {
        // Fallback
      }

      // 2. Fetch Activity
      try {
        const res = await apiClient.get<{ success: boolean; data: ActivityItem[] }>(
          ADMIN_ACTIVITY + '?limit=5',
          undefined,
          true
        );
        setActivities(res.data || []);
      } catch {
        // Fallback
      }

      // 3. Fetch Stats
      try {
        const [galeriaRes, albumesRes] = await Promise.allSettled([
          apiClient.get(GALLERY + '?page=1&limit=1') as Promise<{ meta?: { total?: number } }>,
          apiClient.get(ALBUMS) as Promise<{ data?: unknown[] }>,
        ]);

        let totalMedia = 0;
        if (galeriaRes.status === 'fulfilled') {
          const gVal = galeriaRes.value as { meta?: { total?: number } };
          totalMedia = gVal?.meta?.total || 0;
        }

        let totalAlbumes = 0;
        if (albumesRes.status === 'fulfilled') {
          const aVal = albumesRes.value as { data?: unknown[] };
          totalAlbumes = Array.isArray(aVal?.data) ? aVal.data.length : 0;
        }

        const estimatedFotos = Math.round(totalMedia * 0.8);
        const estimatedVideos = totalMedia - estimatedFotos;

        setStats({
          totalFotos: estimatedFotos,
          totalVideos: estimatedVideos,
          totalAlbumes,
          loaded: true,
        });
      } catch {
        setStats({ totalFotos: 0, totalVideos: 0, totalAlbumes: 0, loaded: true });
      }
    };

    fetchAllData();
  }, []);

  // ── Display name resolution ──────────────────────────────────────
  const displayName = profile?.nombre || 'Administrador';

  return (
    <div className="py-4 sm:py-8">
      {/* ── Saludo personalizado ──────────────────────────── */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-fraunces text-3xl md:text-4xl font-bold text-stone-900 mb-1.5">
              {getGreeting()}, {displayName} 👋
            </h1>
            <p className="text-stone-500 text-base">
              {formatDate()}
            </p>
          </div>
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-stone-500 hover:text-stone-800 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors flex-shrink-0 mt-1"
            title="Editar perfil"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Mi perfil</span>
          </button>
        </div>
      </div>

      {/* ── Stats Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-10 sm:mb-12">
        <StatCard
          icon={ImageIcon}
          value={stats.totalFotos}
          label="Fotos"
          loading={!stats.loaded}
        />
        <StatCard
          icon={Film}
          value={stats.totalVideos}
          label="Videos"
          loading={!stats.loaded}
        />
        <StatCard
          icon={FolderOpen}
          value={stats.totalAlbumes}
          label="Álbumes"
          loading={!stats.loaded}
        />
        <StatCard
          icon={Settings2}
          value={5}
          label="Secciones activas"
          iconBg="bg-amber-50"
          iconColor="text-amber-700"
        />
      </div>

      {/* ── Layout 2 columnas ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">

        {/* Acciones Rápidas (3/5) */}
        <div className="lg:col-span-3">
          <h2 className="text-lg font-bold text-stone-800 mb-4 font-fraunces">
            Acciones rápidas
          </h2>
          <div className="space-y-3">

            <QuickAction
              icon={FolderPlus}
              label="Gestionar álbumes"
              description="Crea o edita álbumes temáticos"
              href={ROUTES.ADMIN_ALBUMS}
            />
            <QuickAction
              icon={Pencil}
              label="Editar sitio web"
              description="Modifica textos, fotos e información pública"
              href={ROUTES.ADMIN_CONTENT}
            />
          </div>
        </div>

        {/* Actividad Reciente (2/5) */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-stone-800 mb-4 font-fraunces">
            Actividad reciente
          </h2>
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            {activities.length === 0 ? (
              <div className="p-6 text-center">
                <Clock className="w-8 h-8 text-stone-300 mx-auto mb-3" />
                <p className="text-sm text-stone-500 mb-1">Sin actividad registrada</p>
                <p className="text-xs text-stone-400">
                  Las acciones que realices aparecerán aquí
                </p>
              </div>
            ) : (
              <div className="divide-y divide-stone-50">
                {activities.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-stone-50/50 transition-colors"
                  >
                    <span className="text-base flex-shrink-0 mt-0.5">
                      {activityIcon(activity.action_type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-700 leading-snug">
                        {activity.action_description}
                      </p>
                      <p className="text-xs text-stone-400 mt-1">
                        {timeAgo(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Profile Edit Modal ────────────────────────────── */}
      {showProfileModal && profile && (
        <ProfileEditModal
          profile={profile}
          onClose={() => setShowProfileModal(false)}
          onSave={(updatedProfile) => setProfile(updatedProfile)}
        />
      )}
    </div>
  );
}
