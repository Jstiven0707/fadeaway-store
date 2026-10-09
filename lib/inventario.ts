// ---------------------------------------------------------------------------
// INVENTARIO: TIPOS Y CLIENTE DE LA API
//
// Este archivo lo importa el navegador, asi que no puede tocar la base de
// datos. Lo de MySQL vive en inventario-db.ts.
// ---------------------------------------------------------------------------

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

export const TIPOS_MOVIMIENTO: Record<
  TipoMovimiento,
  { label: string; signo: string; color: string; ayuda: string }
> = {
  ENTRADA: {
    label: 'Entrada',
    signo: '+',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    ayuda: 'Llegó mercancía: compra al proveedor, reposición, devolución de un cliente.',
  },
  SALIDA: {
    label: 'Salida',
    signo: '−',
    color: 'bg-red-100 text-red-700 border-red-200',
    ayuda: 'Salió mercancía: una venta, una muestra, una unidad dañada.',
  },
  AJUSTE: {
    label: 'Ajuste',
    signo: '=',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    ayuda: 'Hiciste un conteo físico y el sistema no cuadraba: escribe lo que contaste.',
  },
};

/** Debajo de esto una presentación se considera en riesgo de agotarse. */
export const UMBRAL_BAJO = 5;

export interface FilaInventario {
  idVariante: number;
  idProducto: number;
  producto: string;
  presentacion: string;
  stock: number;
  precio: number;
  imageUrl: string | null;
  categoria: string;
  subcategoria: string;
  /** Unidades que han salido por ventas desde que existe el historial */
  vendidas: number;
  ultimoMovimiento: string | null;
}

export interface MovimientoInventario {
  id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  saldo: number;
  motivo: string;
  numeroPedido: string | null;
  usuario: string | null;
  fechaHora: string;
}

export interface ResumenInventario {
  presentaciones: number;
  unidades: number;
  valorizado: number;
  agotadas: number;
  bajas: number;
  umbral: number;
}

/** Semáforo de una presentación, para pintarla siempre igual en todo el panel. */
export const nivelDe = (stock: number, umbral = UMBRAL_BAJO) =>
  stock === 0
    ? { clave: 'agotado' as const, label: 'Agotado', color: 'bg-red-100 text-red-700 border-red-200' }
    : stock <= umbral
      ? { clave: 'bajo' as const, label: 'Quedan pocas', color: 'bg-amber-100 text-amber-800 border-amber-200' }
      : { clave: 'ok' as const, label: 'Disponible', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };

// --- CLIENTE DE LA API ---

const pedir = async <T>(ruta: string, opciones?: RequestInit): Promise<T> => {
  const res = await fetch(ruta, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...opciones,
  });
  const json = await res.json().catch(() => ({ success: false, error: 'Respuesta inesperada del servidor' }));
  if (!res.ok || !json.success) throw new Error(json.error || 'No se pudo completar la operación');
  return json.data as T;
};

export const fetchInventario = (filtros?: { buscar?: string; soloBajos?: boolean }) => {
  const q = new URLSearchParams();
  if (filtros?.buscar) q.set('buscar', filtros.buscar);
  if (filtros?.soloBajos) q.set('bajos', '1');
  const cola = q.toString();
  return pedir<{ filas: FilaInventario[]; resumen: ResumenInventario }>(
    `/api/inventory${cola ? `?${cola}` : ''}`
  );
};

export const fetchMovimientos = (idVariante: number) =>
  pedir<MovimientoInventario[]>(`/api/inventory/${idVariante}`);

export const moverStock = (datos: {
  idVariante: number;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
}) => pedir<{ stock: number }>('/api/inventory', { method: 'POST', body: JSON.stringify(datos) });
