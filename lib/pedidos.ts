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

export const cambiarEstadoPedido = (
  id: number,
  estado: EstadoOrden,
  nota?: string,
  /** Número de transacción, solo al confirmar una transferencia */
  referenciaPago?: string
) =>
  pedir<Pedido>(`/api/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado, nota, referenciaPago }),
  });

export const fetchAjustes = () => pedir<AjustesPago>('/api/admin/ajustes');

export const guardarAjustes = (ajustes: AjustesPago) =>
  pedir<AjustesPago>('/api/admin/ajustes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ajustes),
  });

// ---------------------------------------------------------------------------
// PAGOS Y PERIODOS DE VENTA
// ---------------------------------------------------------------------------

export interface Pago {
  id: number;
  idOrden: number;
  numeroOrden: string;
  cliente: string;
  metodo: MetodoPago;
  monto: number;
  referencia: string | null;
  nota: string | null;
  fechaHora: string;
}

export type Periodo = 'dia' | 'semana' | 'mes' | 'trimestre' | 'semestre' | 'anio';

export const PERIODOS: Record<Periodo, string> = {
  dia: 'Hoy',
  semana: 'Esta semana',
  mes: 'Este mes',
  trimestre: 'Trimestre',
  semestre: 'Semestre',
  anio: 'Año',
};

const aISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Rango de fechas de un periodo, tomando hoy como referencia.
 * La semana arranca el lunes, como se cuenta en Colombia.
 */
export const rangoDe = (periodo: Periodo, ref = new Date()): { desde: string; hasta: string } => {
  const a = ref.getFullYear();
  const m = ref.getMonth();

  switch (periodo) {
    case 'dia':
      return { desde: aISO(ref), hasta: aISO(ref) };
    case 'semana': {
      const diaSemana = (ref.getDay() + 6) % 7; // lunes = 0
      const lunes = new Date(a, m, ref.getDate() - diaSemana);
      const domingo = new Date(a, m, ref.getDate() - diaSemana + 6);
      return { desde: aISO(lunes), hasta: aISO(domingo) };
    }
    case 'mes':
      return { desde: aISO(new Date(a, m, 1)), hasta: aISO(new Date(a, m + 1, 0)) };
    case 'trimestre': {
      const inicio = Math.floor(m / 3) * 3;
      return { desde: aISO(new Date(a, inicio, 1)), hasta: aISO(new Date(a, inicio + 3, 0)) };
    }
    case 'semestre': {
      const inicio = m < 6 ? 0 : 6;
      return { desde: aISO(new Date(a, inicio, 1)), hasta: aISO(new Date(a, inicio + 6, 0)) };
    }
    case 'anio':
      return { desde: aISO(new Date(a, 0, 1)), hasta: aISO(new Date(a, 11, 31)) };
  }
};

export const fetchPagos = (desde: string, hasta: string) =>
  pedir<Pago[]>(`/api/payments?desde=${desde}&hasta=${hasta}`);

// ---------------------------------------------------------------------------
// BANDEJAS DEL ADMIN
//
// El pago y la logistica son dos trabajos distintos: validar que entro la
// plata no tiene nada que ver con alistar y despachar. Por eso van en
// bandejas separadas, y lo ya cerrado sale de ambas.
// ---------------------------------------------------------------------------

export type Bandeja = 'pagos' | 'logistica' | 'finalizados';

export const BANDEJAS: Record<Bandeja, { label: string; icono: string; estados: EstadoOrden[] }> = {
  pagos: {
    label: 'Pagos',
    icono: '💵',
    estados: ['PENDIENTE_PAGO', 'CONFIRMADO'],
  },
  logistica: {
    label: 'Logística',
    icono: '📦',
    estados: ['PENDIENTE_ALISTAMIENTO', 'EN_PREPARACION', 'ALISTADO', 'ENVIADO'],
  },
  finalizados: {
    label: 'Finalizados',
    icono: '✓',
    estados: ['ENTREGADO', 'CANCELADO'],
  },
};

export const bandejaDe = (estado: EstadoOrden): Bandeja =>
  (Object.keys(BANDEJAS) as Bandeja[]).find((b) => BANDEJAS[b].estados.includes(estado)) ?? 'finalizados';
