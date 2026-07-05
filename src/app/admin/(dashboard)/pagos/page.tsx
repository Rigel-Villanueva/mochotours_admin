'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Calendar, CheckCircle, Clock, Edit2, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiClient } from '@/shared/api/apiClient';
import { ADMIN_PAGOS_API, ADMIN_PAGOS_PAGAR, ADMIN_PAGOS_FECHA } from '@/shared/config/api-endpoints';
import { useAuth } from '@/entities/user';

// ── Tipos ────────────────────────────────────────────────────────────

type Pago = {
  id: number;
  fecha_pago: string;
  pagado: boolean;
  created_at: string;
};

// ── Helpers ──────────────────────────────────────────────────────────

/** Formatea una fecha ISO/date sin problemas de zona horaria */
function formatFecha(dateStr: string, fmt: string): string {
  // Extraemos solo la parte YYYY-MM-DD para evitar desfase por UTC
  const datePart = dateStr.split('T')[0]; // '2026-06-28'
  const [year, month, day] = datePart.split('-').map(Number);
  // Construimos la fecha en hora local (sin UTC) para evitar que el día cambie
  const date = new Date(year, month - 1, day);
  return format(date, fmt, { locale: es });
}

/** Convierte fecha ISO a valor YYYY-MM-DD para input[type=date] */
function toInputDate(dateStr: string): string {
  return dateStr.split('T')[0];
}

// ── Componente principal ─────────────────────────────────────────────

export default function PagosPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.rol === 'superadmin';

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal confirmación de pago
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingPayId, setPendingPayId] = useState<number | null>(null);

  // Modal edición de fecha
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPago, setSelectedPago] = useState<Pago | null>(null);
  const [newDate, setNewDate] = useState('');

  // ── Fetch ─────────────────────────────────────────────────────────

  const fetchPagos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await apiClient.get<{ success: boolean; data: Pago[] }>(
        ADMIN_PAGOS_API,
        undefined,
        true
      );
      setPagos(res.data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar pagos';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchPagos();
  }, [isSuperAdmin, fetchPagos]);

  // ── Handlers ──────────────────────────────────────────────────────

  // Abre el modal de confirmación en lugar de window.confirm
  const handlePagarClick = (id: number) => {
    setPendingPayId(id);
    setIsConfirmModalOpen(true);
  };

  // Se llama solo si el usuario confirmó en el modal
  const handleConfirmPagar = async () => {
    if (pendingPayId === null) return;
    setIsConfirmModalOpen(false);
    try {
      setIsProcessing(true);
      await apiClient.put(ADMIN_PAGOS_PAGAR(pendingPayId), {}, true);
      await fetchPagos();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al procesar el pago';
      alert(message);
    } finally {
      setIsProcessing(false);
      setPendingPayId(null);
    }
  };

  const handleSaveDate = async () => {
    if (!selectedPago || !newDate) return;
    try {
      setIsProcessing(true);
      await apiClient.put(ADMIN_PAGOS_FECHA(selectedPago.id), { fecha_pago: newDate }, true);
      setIsEditModalOpen(false);
      await fetchPagos();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al modificar la fecha';
      alert(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditModal = (pago: Pago) => {
    setSelectedPago(pago);
    setNewDate(toInputDate(pago.fecha_pago));
    setIsEditModalOpen(true);
  };

  // ── Guards ────────────────────────────────────────────────────────

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 text-red-700 p-8 rounded-3xl flex flex-col items-center gap-4 max-w-md text-center border border-red-100 shadow-sm">
          <AlertCircle className="size-12 text-red-400" />
          <h2 className="text-2xl font-black">Acceso Restringido</h2>
          <p className="text-red-500">Esta sección es exclusiva para Superadmin.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="size-6 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-lg mb-1">Ocurrió un error</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const latestPago = pagos[0] ?? null;
  const historyPagos = pagos.slice(1);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
            Gestión de Pagos
          </h1>
          <p className="text-stone-500 mt-1 md:text-lg">Control y registro de mensualidades</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 rounded-2xl shadow-sm hidden md:block">
          <CreditCard className="size-8" />
        </div>
      </div>

      {/* TARJETA MES ACTUAL */}
      {latestPago ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 to-stone-800 text-white shadow-2xl"
        >
          {/* Fondos decorativos */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

          <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">

            {/* Info del mes */}
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium backdrop-blur-md">
                {latestPago.pagado ? (
                  <><CheckCircle className="size-4 text-green-400" /><span className="text-green-50">Al día</span></>
                ) : (
                  <><Clock className="size-4 text-amber-400" /><span className="text-amber-50">Mensualidad Pendiente</span></>
                )}
              </div>

              <div>
                <h2 className="text-xs font-bold text-stone-400 uppercase tracking-[0.2em] mb-2">
                  Mes de Cobro Actual
                </h2>
                <div className="flex items-center gap-4">
                  <p className="text-4xl md:text-5xl font-black capitalize">
                    {formatFecha(latestPago.fecha_pago, 'MMMM yyyy')}
                  </p>
                  <button
                    onClick={() => openEditModal(latestPago)}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-stone-300 hover:text-white"
                    title="Modificar fecha"
                  >
                    <Edit2 className="size-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Botón pagar */}
            <div className="w-full md:w-auto">
              {!latestPago.pagado ? (
                <button
                  onClick={() => handlePagarClick(latestPago.id)}
                  disabled={isProcessing}
                  className="w-full md:w-auto px-8 py-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-lg rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  <CheckCircle className="size-6" />
                  {isProcessing ? 'Procesando...' : 'Registrar Pago y Generar Siguiente'}
                </button>
              ) : (
                <div className="px-8 py-6 bg-white/5 rounded-2xl border border-white/10 text-center">
                  <p className="text-stone-200 font-medium text-lg">Este mes ya está pagado ✨</p>
                  <p className="text-sm text-stone-400 mt-1">El siguiente mes fue generado automáticamente.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="bg-stone-50 rounded-3xl p-10 text-center text-stone-500 border border-stone-200">
          <p className="text-lg font-semibold">No hay registros de pagos aún.</p>
        </div>
      )}

      {/* HISTORIAL */}
      {historyPagos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4 pt-4"
        >
          <h3 className="text-xl font-bold text-stone-900 px-1">Historial de Pagos</h3>
          <div className="bg-white border border-stone-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50/50 text-xs uppercase tracking-wider font-bold text-stone-500">
                    <th className="px-6 py-5">Mes / Fecha</th>
                    <th className="px-6 py-5">Estado</th>
                    <th className="px-6 py-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {historyPagos.map((pago) => (
                    <tr key={pago.id} className="hover:bg-stone-50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center border border-stone-200/50 group-hover:bg-white group-hover:shadow-sm transition-all">
                            <Calendar className="size-5 text-stone-500" />
                          </div>
                          <div>
                            <p className="font-bold text-stone-900 capitalize text-lg">
                              {formatFecha(pago.fecha_pago, 'MMMM yyyy')}
                            </p>
                            <p className="text-sm text-stone-500 font-medium">
                              {formatFecha(pago.fecha_pago, 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${
                          pago.pagado
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {pago.pagado ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => openEditModal(pago)}
                          className="p-3 text-stone-400 hover:text-stone-900 hover:bg-stone-200 rounded-xl transition-colors"
                          title="Modificar fecha"
                        >
                          <Edit2 className="size-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* MODAL CONFIRMACIÓN DE PAGO */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/50 backdrop-blur-md"
              onClick={() => setIsConfirmModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative bg-white rounded-3xl p-8 md:p-10 max-w-sm w-full shadow-2xl text-center"
            >
              {/* Ícono */}
              <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                <CheckCircle className="size-8 text-amber-600" />
              </div>

              <h3 className="text-2xl font-black text-stone-900 mb-3">Registrar Pago</h3>
              <p className="text-stone-500 mb-2 leading-relaxed">
                ¿Confirmas el pago correspondiente al día{' '}
                <span className="font-black text-stone-900 capitalize">
                  {pagos[0]
                    ? formatFecha(pagos[0].fecha_pago, "dd 'de' MMMM yyyy")
                    : '—'}
                </span>
                ?
              </p>
              <p className="text-stone-400 text-sm mb-8">
                Se generará automáticamente el registro del siguiente mes.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 px-4 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmPagar}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-orange-200 disabled:opacity-50"
                >
                  {isProcessing ? 'Procesando...' : 'Sí, registrar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL MODIFICAR FECHA */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-md"
              onClick={() => setIsEditModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl p-8 md:p-10 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-2xl font-black text-stone-900 mb-2">Modificar Fecha</h3>
              <p className="text-stone-500 mb-8">
                Ajusta la fecha de cobro del registro seleccionado.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2 uppercase tracking-wide">
                    Nueva Fecha
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-5 py-4 bg-stone-50 rounded-2xl border-2 border-stone-200 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-medium text-lg text-stone-800"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-4 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveDate}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-4 bg-stone-900 hover:bg-black text-white font-bold rounded-2xl transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
