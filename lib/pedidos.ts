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
  | 'CANCELADO'
  | 'DEVOLUCION';

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
    siguientes: ['DEVOLUCION'],
  },
  CANCELADO: {
    label: 'Cancelado',
    etapa: 'Cerrado',
    color: 'bg-red-100 text-red-700 border-red-200',
    siguientes: [],
  },
  DEVOLUCION: {
    label: 'Devolución',
    etapa: 'Cerrado',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
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
  'DEVOLUCION',
];

export const METODOS_PAGO: Record<MetodoPago, { label: string; desc: string; anticipado: boolean }> = {
  NEQUI: { label: 'Nequi', desc: 'Transferencia antes del envío', anticipado: true },
  DAVIPLATA: { label: 'Daviplata', desc: 'Transferencia antes del envío', anticipado: true },
  CONTRAENTREGA: { label: 'Pago Contraentrega', desc: 'Pagas al recibir', anticipado: false },
};

/**
 * Todo pedido nace sin pagar, incluido el contraentrega.
 *
 * Antes el contraentrega nacía CONFIRMADO, lo que daba a entender que la plata
 * ya había entrado cuando en realidad no se cobra hasta entregar.
 */
export const estadoInicial = (_metodo: MetodoPago): EstadoOrden => 'PENDIENTE_PAGO';

/**
 * A dónde puede moverse un pedido, que no depende solo del estado sino de
 * cómo se paga.
 *
 * La diferencia está en PENDIENTE_PAGO:
 *   - anticipado: hay un comprobante que revisar, así que pasa por CONFIRMADO
 *   - contraentrega: no hay nada que confirmar todavía, así que va derecho a
 *     alistamiento y el cobro se resuelve solo al entregar
 */
export const siguientesDe = (desde: EstadoOrden, metodo: MetodoPago): EstadoOrden[] => {
  if (desde === 'PENDIENTE_PAGO' && !METODOS_PAGO[metodo].anticipado) {
    return ['PENDIENTE_ALISTAMIENTO', 'CANCELADO'];
  }
  return ESTADOS[desde].siguientes;
};

export const puedeAvanzarA = (desde: EstadoOrden, hasta: EstadoOrden, metodo: MetodoPago) =>
  siguientesDe(desde, metodo).includes(hasta);

// ---------------------------------------------------------------------------
// ESTADO DEL DINERO
//
// Es una lectura del pedido, no una columna: se deduce del estado logístico y
// del método. Así no hay dos verdades que puedan quedar desalineadas.
// ---------------------------------------------------------------------------

export type EstadoPago = 'ESPERANDO_COMPROBANTE' | 'SE_COBRA_AL_ENTREGAR' | 'PAGADO' | 'DEVUELTO';

export const ESTADOS_PAGO: Record<EstadoPago, { label: string; corto: string; color: string; ayuda: string }> = {
  ESPERANDO_COMPROBANTE: {
    label: 'Esperando comprobante',
    corto: 'Sin pagar',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    ayuda: 'El cliente debe transferir y enviarte el soporte. Hasta que no lo veas, no lo confirmes.',
  },
  SE_COBRA_AL_ENTREGAR: {
    label: 'Se cobra al entregar',
    corto: 'Cobra al entregar',
    color: 'bg-sky-100 text-sky-800 border-sky-200',
    ayuda: 'No hay nada que confirmar: el dinero entra cuando lo entregues. Puedes alistarlo ya.',
  },
  PAGADO: {
    label: 'Pagado',
    corto: 'Pagado',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    ayuda: 'La plata ya entró y quedó registrada en Ventas.',
  },
  DEVUELTO: {
    label: 'Devuelto',
    corto: 'Devuelto',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    ayuda: 'El pedido volvió y el cobro quedó reversado en Ventas.',
  },
};

/** En qué va el dinero de este pedido, mirando estado y método juntos. */
export const estadoPagoDe = (pedido: { estado: EstadoOrden; metodoPago: MetodoPago }): EstadoPago => {
  if (pedido.estado === 'DEVOLUCION') return 'DEVUELTO';

  if (METODOS_PAGO[pedido.metodoPago].anticipado) {
    // Prepago: la plata entra al confirmar el comprobante
    return pedido.estado === 'PENDIENTE_PAGO' || pedido.estado === 'CANCELADO'
      ? 'ESPERANDO_COMPROBANTE'
      : 'PAGADO';
  }

  // Contraentrega: la plata entra al poner el producto en manos del cliente
  return pedido.estado === 'ENTREGADO' ? 'PAGADO' : 'SE_COBRA_AL_ENTREGAR';
};

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
    estados: ['ENTREGADO', 'CANCELADO', 'DEVOLUCION'],
  },
};

export const bandejaDe = (estado: EstadoOrden): Bandeja =>
  (Object.keys(BANDEJAS) as Bandeja[]).find((b) => BANDEJAS[b].estados.includes(estado)) ?? 'finalizados';

/** Elimina un pedido. Solo el perfil owner tiene permiso. */
export const eliminarPedido = (id: number) =>
  pedir<null>(`/api/orders/${id}`, { method: 'DELETE' });
