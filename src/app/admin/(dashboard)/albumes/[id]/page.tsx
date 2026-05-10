'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { apiClient } from '@/shared/api/apiClient';
import { ALBUM_BY_ID, GALLERY, GALLERY_BY_ID } from '@/shared/config/api-endpoints';
import {
  ArrowLeft, Upload, ImageIcon, Film, Star, Trash2, X,
  GripVertical, Loader2, UploadCloud, CheckCircle2, Pencil, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ───────────────────────────────────────────────────────────

type Album = {
  id: string;
  titulo: string;
  slug: string;
  descripcion: string | null;
  coverStoragePath: string | null;
  coverUrl: string | null;
  isActive: boolean;
  destacado: boolean;
};

type GaleriaItem = {
  id: string;
  urlMedia: string;
  tipo: 'imagen' | 'video';
  titulo: string | null;
  descripcion: string | null;
  altText: string | null;
  destacada: boolean;
  orden: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  storagePath: string;
};

// ── Component ───────────────────────────────────────────────────────

export default function AdminAlbumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const albumId = params.id as string;

  const [album, setAlbum] = useState<Album | null>(null);
  const [items, setItems] = useState<GaleriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState({ titulo: '', descripcion: '', altText: '' });

  // Estado para la edición de un item existente
  const [editingItem, setEditingItem] = useState<GaleriaItem | null>(null);
  const [editForm, setEditForm] = useState({ titulo: '', descripcion: '', altText: '' });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Auto-abrir modal si viene de la vista general
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('upload') === 'true') {
        setShowUploadModal(true);
        router.replace(`/admin/albumes/${albumId}`, undefined);
      }
    }
  }, [albumId, router]);

  const fetchAlbum = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: true; data: Album }>(
        ALBUM_BY_ID(albumId), {}, true
      );
      setAlbum(res.data);
    } catch (err) {
      console.error('Error fetching album:', err);
    }
  }, [albumId]);

  const fetchItems = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: true; data: GaleriaItem[] }>(
        GALLERY, { albumId, limit: 100 }, true
      );
      setItems(res.data);
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    fetchAlbum();
    fetchItems();
  }, [fetchAlbum, fetchItems]);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('tipo', uploadFile.type.startsWith('video/') ? 'video' : 'imagen');
      formData.append('albumId', albumId);
      if (uploadForm.titulo) formData.append('titulo', uploadForm.titulo);
      if (uploadForm.descripcion) formData.append('descripcion', uploadForm.descripcion);
      if (uploadForm.altText) formData.append('altText', uploadForm.altText);

      await apiClient.postFormData(GALLERY, formData, true);

      toast.success('Archivo subido', {
        description: 'La foto/video se agregó al álbum correctamente.'
      });

      setShowUploadModal(false);
      setUploadFile(null);
      setPreviewUrl(null);
      setUploadForm({ titulo: '', descripcion: '', altText: '' });
      fetchItems();
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error uploading:', error);
      toast.error('Error al subir', {
        description: error.message || 'Hubo un problema al subir el archivo.'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSetCover = async (item: GaleriaItem) => {
    if (!album) return;
    
    // Optimistic UI Update
    const previousAlbum = { ...album };
    setAlbum({ ...album, coverStoragePath: item.storagePath });

    try {
      await apiClient.put(ALBUM_BY_ID(album.id), {
        coverStoragePath: item.storagePath,
        titulo: album.titulo,
        slug: album.slug,
      }, true);
      toast.success('Portada actualizada', {
        description: 'Se ha cambiado la foto de portada del álbum.'
      });
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error setting cover:', error);
      setAlbum(previousAlbum);
      toast.error('Error al actualizar', {
        description: error.message || 'No se pudo cambiar la portada.'
      });
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await apiClient.delete(GALLERY_BY_ID(id), true);
      toast.success('Elemento eliminado', {
        description: 'La foto o video se ha borrado correctamente.'
      });
      fetchItems();
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error deleting item:', error);
      toast.error('Error al eliminar', {
        description: error.message || 'No se pudo borrar el elemento.'
      });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleEditSave = async () => {
    if (!editingItem) return;
    setUploading(true);
    try {
      await apiClient.put(GALLERY_BY_ID(editingItem.id), editForm, true);
      toast.success('Detalles guardados', {
        description: 'Se actualizó la información correctamente.'
      });
      setEditingItem(null);
      fetchItems();
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error actualizando item:', error);
      toast.error('Error al guardar', {
        description: error.message || 'No se pudieron guardar los cambios.'
      });
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (item: GaleriaItem) => {
    setEditingItem(item);
    setEditForm({
      titulo: item.titulo || '',
      descripcion: item.descripcion || '',
      altText: item.altText || ''
    });
  };

  const photosCount = items.filter(i => i.tipo === 'imagen').length;
  const videosCount = items.filter(i => i.tipo === 'video').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 text-center">
        <p className="text-stone-500">Álbum no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Back + Header */}
      <button
        onClick={() => router.push('/admin/albumes')}
        className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Álbumes
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold font-fraunces text-stone-900">
            {album.titulo}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-stone-400">
            <span className="flex items-center gap-1">
              <ImageIcon className="h-4 w-4" />
              {photosCount} fotos
            </span>
            <span className="text-stone-300">·</span>
            <span className="flex items-center gap-1">
              <Film className="h-4 w-4" />
              {videosCount} videos
            </span>
            <span className="text-stone-300">·</span>
            <span className="font-mono text-xs text-stone-300">/galeria/{album.slug}</span>
          </div>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Upload className="h-4 w-4" />
          Subir archivo
        </button>
      </div>

      {/* Grid de items */}
      {items.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-2xl">
          <ImageIcon className="h-12 w-12 mx-auto text-stone-300 mb-4" />
          <p className="text-stone-500">Este álbum está vacío.</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-4 text-green-700 hover:text-green-800 text-sm font-medium underline"
          >
            Subir la primera foto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative group bg-white rounded-lg border border-stone-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              <div className="relative aspect-square bg-stone-100">
                {item.tipo === 'video' ? (
                  <div className="relative w-full h-full bg-stone-900 overflow-hidden">
                    <video
                      src={item.urlMedia}
                      controls
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <Image
                    src={item.urlMedia}
                    alt={item.altText || item.titulo || 'Foto'}
                    fill
                    className="object-cover"
                    sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                  />
                )}

                {/* Drag handle visual */}
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-4 w-4 text-white drop-shadow" />
                </div>

                {/* Cover badge */}
                {album.coverStoragePath === item.storagePath && (
                  <span className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded">
                    Portada
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-3 bg-white flex items-center justify-between gap-2 border-t border-stone-100">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-stone-700 truncate">
                    {item.titulo || item.altText || 'Sin título'}
                  </p>
                  <p className="text-[10px] text-stone-400 capitalize mt-0.5">{item.tipo}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditModal(item)}
                    title="Editar detalles"
                    className="p-1.5 text-stone-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleSetCover(item)}
                    title="Usar como portada"
                    className={`p-1.5 rounded transition-colors ${
                      album.coverStoragePath === item.storagePath
                        ? 'text-amber-500 bg-amber-50'
                        : 'text-stone-400 hover:text-amber-500 hover:bg-amber-50'
                    }`}
                  >
                    <Star className={`h-4 w-4 ${album.coverStoragePath === item.storagePath ? 'fill-amber-500' : ''}`} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(item.id)}
                    title="Eliminar"
                    className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ UPLOAD MODAL (Two-State Design) ═══ */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-stone-100">
              <h2 className="text-xl font-bold font-fraunces text-stone-900">
                Subir a &quot;{album.titulo}&quot;
              </h2>
              <button 
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setPreviewUrl(null);
                }} 
                className="text-stone-400 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 p-2 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto">
              {/* Momento 1: Sin archivo */}
              {!uploadFile ? (
                <div className="relative border-2 border-dashed border-stone-300 hover:border-green-500 hover:bg-green-50 rounded-2xl p-12 text-center transition-all cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadFile(file);
                        setPreviewUrl(URL.createObjectURL(file));
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="bg-white w-16 h-16 rounded-full shadow-sm border border-stone-100 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform pointer-events-none">
                    <UploadCloud className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-stone-800 mb-1 pointer-events-none">Haz clic o arrastra un archivo</h3>
                  <p className="text-sm text-stone-500 mb-2 pointer-events-none">JPG, PNG, MP4 hasta 50MB</p>
                </div>
              ) : (
                /* Momento 2: Con archivo */
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                  
                  {/* Tarjeta de confirmación visual */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-200 shrink-0 relative border border-black/5">
                      {uploadFile.type.startsWith('video/') ? (
                        <div className="w-full h-full flex items-center justify-center bg-stone-900">
                          <Film className="h-8 w-8 text-stone-400" />
                        </div>
                      ) : previewUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-green-900 truncate">
                          {uploadFile.name}
                        </p>
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      </div>
                      <p className="text-xs text-green-700/80 mt-0.5">
                        {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • {uploadFile.type.split('/')[1].toUpperCase()}
                      </p>
                      <div className="flex gap-3 mt-2">
                        <label className="text-xs font-medium text-green-700 hover:text-green-800 cursor-pointer underline decoration-green-300 underline-offset-2">
                          Cambiar
                          <input
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setUploadFile(file);
                                setPreviewUrl(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </label>
                        <button
                          onClick={() => {
                            setUploadFile(null);
                            setPreviewUrl(null);
                          }}
                          className="text-xs font-medium text-stone-500 hover:text-red-600 transition-colors"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Campos de Metadata */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-sm font-semibold text-stone-800">Detalles de la foto (Opcional)</h4>
                    
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Título</label>
                      <input
                        type="text"
                        value={uploadForm.titulo}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, titulo: e.target.value }))}
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-stone-50 focus:bg-white transition-colors"
                        placeholder="Ej. Entrada principal"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Descripción</label>
                      <textarea
                        value={uploadForm.descripcion}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, descripcion: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-stone-50 focus:bg-white transition-colors resize-none"
                        placeholder="Describe lo que se ve en la foto..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">
                        Alt text <span className="text-stone-400 font-normal">(Para SEO)</span>
                      </label>
                      <input
                        type="text"
                        value={uploadForm.altText}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, altText: e.target.value }))}
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-stone-50 focus:bg-white transition-colors"
                        placeholder="Ej. Turistas nadando en el cenote cerrado"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-5 sm:p-6 border-t border-stone-100 bg-stone-50/50">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setPreviewUrl(null);
                }}
                className="px-5 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:border-stone-300 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadFile}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2"
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</>
                ) : (
                  'Subir archivo'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EDIT MODAL ═══ */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-stone-100">
              <h2 className="text-xl font-bold font-fraunces text-stone-900">
                Editar información
              </h2>
              <button 
                onClick={() => setEditingItem(null)} 
                className="text-stone-400 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 p-2 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Título</label>
                  <input
                    type="text"
                    value={editForm.titulo}
                    onChange={(e) => setEditForm(prev => ({ ...prev, titulo: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-stone-50 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Descripción</label>
                  <textarea
                    value={editForm.descripcion}
                    onChange={(e) => setEditForm(prev => ({ ...prev, descripcion: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-stone-50 focus:bg-white transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Alt text <span className="text-stone-400 font-normal">(SEO)</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.altText}
                    onChange={(e) => setEditForm(prev => ({ ...prev, altText: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-stone-50 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 sm:p-6 border-t border-stone-100 bg-stone-50/50">
              <button
                onClick={() => setEditingItem(null)}
                className="px-5 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:border-stone-300 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSave}
                disabled={uploading}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2"
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                ) : (
                  'Guardar cambios'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL Eliminar Elemento ═══ */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-stone-900 mb-2">¿Eliminar elemento?</h2>
              <p className="text-sm text-stone-500 mb-6">
                Esta acción borrará esta foto o video del servidor y no podrá recuperarse.
              </p>
              
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteItem(deleteConfirmId)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
