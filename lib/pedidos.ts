// ---------------------------------------------------------------------------
// PEDIDOS: TIPOS, FLUJO DE ESTADOS Y CLIENTE DE LA API
// ---------------------------------------------------------------------------

export type EstadoOrden =
  | 'PENDIENTE_PAGO'
  | 'CONFIRMADO'
  | 'PENDIENTE_ALISTAMIENTO'
  | 'EN_PREPARACION'
  | 'ALISTADO'
  | 'ENVIADO'
  | 'ENTREGADO'
  | 'CANCELADO';

export type MetodoPago = 'NEQUI' | 'DAVIPLATA' | 'CONTRAENTREGA';
export type CanalVenta = 'Web' | 'WhatsApp' | 'Facebook' | 'Instagram' | 'Directo';

interface DefinicionEstado {
  label: string;
  etapa: 'Validación' | 'Logística' | 'Cerrado';
  /** Clases de Tailwind para la etiqueta de estado */
  color: string;
  /** A que estados se puede mover desde aqui */
  siguientes: EstadoOrden[];
}

/**
 * El pedido pasa por dos etapas. Validacion resuelve el dinero; logistica
 * resuelve la entrega. Contraentrega entra directo a CONFIRMADO porque no
 * hay nada que esperar: el cliente paga al recibir.
 */
export const ESTADOS: Record<EstadoOrden, DefinicionEstado> = {
  PENDIENTE_PAGO: {
    label: 'Pendiente de Pago',
    etapa: 'Validación',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    siguientes: ['CONFIRMADO', 'CANCELADO'],
  },
  CONFIRMADO: {
    label: 'Confirmado',
    etapa: 'Validación',
    color: 'bg-sky-100 text-sky-800 border-sky-200',
    siguientes: ['PENDIENTE_ALISTAMIENTO', 'CANCELADO'],
  },
  PENDIENTE_ALISTAMIENTO: {
    label: 'Pendiente Alistamiento',
    etapa: 'Logística',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    siguientes: ['EN_PREPARACION', 'CANCELADO'],
  },
  EN_PREPARACION: {
    label: 'En Preparación',
    etapa: 'Logística',
    color: 'bg-violet-100 text-violet-800 border-violet-200',
    siguientes: ['ALISTADO', 'CANCELADO'],
  },
  ALISTADO: {
    label: 'Alistado',
    etapa: 'Logística',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    siguientes: ['ENVIADO', 'CANCELADO'],
  },
  ENVIADO: {
    label: 'Enviado',
    etapa: 'Logística',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    siguientes: ['ENTREGADO', 'CANCELADO'],
  },
  ENTREGADO: {
    label: 'Entregado',
    etapa: 'Cerrado',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    siguientes: ['CANCELADO'],
  },
  CANCELADO: {
    label: 'Cancelado / Devolución',
    etapa: 'Cerrado',
    color: 'bg-red-100 text-red-700 border-red-200',
    siguientes: [],
  },
};

export const ORDEN_ESTADOS: EstadoOrden[] = [
  'PENDIENTE_PAGO',
  'CONFIRMADO',
  'PENDIENTE_ALISTAMIENTO',
  'EN_PREPARACION',
  'ALISTADO',
  'ENVIADO',
  'ENTREGADO',
  'CANCELADO',
];

export const METODOS_PAGO: Record<MetodoPago, { label: string; desc: string; anticipado: boolean }> = {
  NEQUI: { label: 'Nequi', desc: 'Transferencia antes del envío', anticipado: true },
  DAVIPLATA: { label: 'Daviplata', desc: 'Transferencia antes del envío', anticipado: true },
  CONTRAENTREGA: { label: 'Pago Contraentrega', desc: 'Pagas al recibir', anticipado: false },
};

/** Estado con el que nace un pedido segun como se vaya a pagar. */
export const estadoInicial = (metodo: MetodoPago): EstadoOrden =>
  METODOS_PAGO[metodo].anticipado ? 'PENDIENTE_PAGO' : 'CONFIRMADO';

export const puedeAvanzarA = (desde: EstadoOrden, hasta: EstadoOrden) =>
  ESTADOS[desde].siguientes.includes(hasta);

// --- ESTRUCTURAS ---

export interface ItemPedido {
  idProducto: number | null;
  nombreProducto: string;
  presentacion: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CambioEstado {
  estado: EstadoOrden;
  nota: string | null;
  fechaHora: string;
}

export interface Pedido {
  id: number;
  numero: string;
  nombre: string;
  apellido: string;
  ciudad: string;
  direccionEnvio: string;
  telefono: string;
  notas: string | null;
  metodoPago: MetodoPago;
  canal: CanalVenta;
  estado: EstadoOrden;
  subtotal: number;
  costoEnvio: number;
  total: number;
  tokenResena: string | null;
  fecha: string;
  items: ItemPedido[];
  historial: CambioEstado[];
}

export interface PedidoInput {
  nombre: string;
  apellido: string;
  ciudad: string;
  direccionEnvio: string;
  telefono: string;
  notas?: string;
  metodoPago: MetodoPago;
  canal?: CanalVenta;
  costoEnvio: number;
  items: Array<{ idProducto: number; presentacion: string; cantidad: number }>;
}

export interface AjustesPago {
  nequiNumero: string;
  nequiQr: string;
  daviplataNumero: string;
  daviplataQr: string;
  whatsappNumero: string;
}

// --- CLIENTE DE LA API ---

const pedir = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { cache: 'no-store', ...init });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'La operación no se pudo completar');
  return json.data as T;
};

export const crearPedido = (input: PedidoInput) =>
  pedir<Pedido>('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

export const fetchPedidos = (estado?: EstadoOrden | 'TODOS') =>
  pedir<Pedido[]>(`/api/orders${estado && estado !== 'TODOS' ? `?estado=${estado}` : ''}`);

export const cambiarEstadoPedido = (id: number, estado: EstadoOrden, nota?: string) =>
  pedir<Pedido>(`/api/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado, nota }),
  });

export const fetchAjustes = () => pedir<AjustesPago>('/api/admin/ajustes');

export const guardarAjustes = (ajustes: AjustesPago) =>
  pedir<AjustesPago>('/api/admin/ajustes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ajustes),
  });
