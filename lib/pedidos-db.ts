// ---------------------------------------------------------------------------
// CONSULTAS DE PEDIDOS CONTRA MySQL
//
// Crear un pedido toca tres tablas (ordenes, detalle_ordenes y
// product_variants, por el stock) y debe ser todo o nada: si una presentacion
// se queda sin inventario a mitad de camino, no puede quedar media venta.
// ---------------------------------------------------------------------------

import { randomBytes, randomUUID } from 'node:crypto';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { db } from '@/lib/db';
import {
  AjustesPago,
  CambioEstado,
  EstadoOrden,
  ItemPedido,
  MetodoPago,
  ORDEN_ESTADOS,
  Pedido,
  PedidoInput,
  estadoInicial,
  puedeAvanzarA,
} from '@/lib/pedidos';

const METODOS: MetodoPago[] = ['NEQUI', 'DAVIPLATA', 'CONTRAENTREGA'];

/** Error de negocio: la ruta lo traduce a un 400 con mensaje para el cliente. */
export class ErrorPedido extends Error {}

const texto = (v: unknown, campo: string, max: number, obligatorio = true): string => {
  const s = String(v ?? '').trim();
  if (obligatorio && !s) throw new ErrorPedido(`El campo ${campo} es obligatorio`);
  if (s.length > max) throw new ErrorPedido(`El campo ${campo} es demasiado largo`);
  return s;
};

export const leerEntradaPedido = (body: unknown): PedidoInput => {
  const b = (body ?? {}) as Record<string, unknown>;

  const metodoPago = String(b.metodoPago ?? '') as MetodoPago;
  if (!METODOS.includes(metodoPago)) throw new ErrorPedido('Elige un método de pago válido');

  const items = Array.isArray(b.items) ? b.items : [];
  if (items.length === 0) throw new ErrorPedido('El carrito está vacío');

  const normalizados = items.map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const idProducto = Number(o.idProducto);
    const cantidad = Math.trunc(Number(o.cantidad));
    if (!Number.isInteger(idProducto) || idProducto <= 0) {
      throw new ErrorPedido('Hay un producto inválido en el carrito');
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new ErrorPedido('Las cantidades deben ser mayores a cero');
    }
    return { idProducto, presentacion: texto(o.presentacion, 'presentación', 40), cantidad };
  });

  const costoEnvio = Number(b.costoEnvio ?? 0);
  if (!Number.isFinite(costoEnvio) || costoEnvio < 0) {
    throw new ErrorPedido('El costo de envío no es válido');
  }

  return {
    nombre: texto(b.nombre, 'nombre', 100),
    apellido: texto(b.apellido, 'apellido', 100),
    ciudad: texto(b.ciudad, 'ciudad', 100),
    direccionEnvio: texto(b.direccionEnvio, 'dirección', 500),
    telefono: texto(b.telefono, 'teléfono', 30),
    notas: texto(b.notas, 'notas', 500, false) || undefined,
    metodoPago,
    canal: (b.canal as PedidoInput['canal']) ?? 'Web',
    costoEnvio,
    items: normalizados,
  };
};

const SELECT_PEDIDO = `
  SELECT o.id, o.numero, o.nombre, o.apellido, o.ciudad, o.direccion_envio, o.telefono,
         o.notas, o.metodo_pago, o.canal, o.estado, o.subtotal, o.costo_envio, o.total,
         o.token_resena, o.fecha_crecion, o.hora_de_crecion
  FROM ordenes o
  WHERE o.estado_regis = 'ACTIVO'
`;

const filaAPedido = (r: RowDataPacket, items: ItemPedido[], historial: CambioEstado[]): Pedido => ({
  id: Number(r.id),
  numero: r.numero,
  nombre: r.nombre,
  apellido: r.apellido,
  ciudad: r.ciudad,
  direccionEnvio: r.direccion_envio,
  telefono: r.telefono,
  notas: r.notas,
  metodoPago: r.metodo_pago,
  canal: r.canal,
  estado: r.estado,
  subtotal: Number(r.subtotal),
  costoEnvio: Number(r.costo_envio),
  total: Number(r.total),
  tokenResena: r.token_resena,
  // fecha_crecion llega como Date y hora_de_crecion como texto HH:MM:SS
  fecha: `${new Date(r.fecha_crecion).toISOString().slice(0, 10)} ${String(r.hora_de_crecion)}`,
  items,
  historial,
});

/** Carga items e historial de varios pedidos en dos consultas, no en 2N. */
const armarPedidos = async (filas: RowDataPacket[]): Promise<Pedido[]> => {
  if (filas.length === 0) return [];
  const ids = filas.map((f) => f.id);
  const marcas = ids.map(() => '?').join(',');

  const [detalles] = await db.query<RowDataPacket[]>(
    `SELECT id_orden, id_producto, nombre_producto, presentacion, cantidad, precio_unitario
       FROM detalle_ordenes WHERE id_orden IN (${marcas}) ORDER BY id`,
    ids
  );
  const [historial] = await db.query<RowDataPacket[]>(
    `SELECT id_orden, estado, nota, fecha_hora
       FROM historial_estados WHERE id_orden IN (${marcas}) ORDER BY id`,
    ids
  );

  const porPedido = <T>(lista: RowDataPacket[], mapear: (r: RowDataPacket) => T) => {
    const mapa = new Map<number, T[]>();
    for (const r of lista) {
      const arr = mapa.get(r.id_orden) ?? [];
      arr.push(mapear(r));
      mapa.set(r.id_orden, arr);
    }
    return mapa;
  };

  const items = porPedido<ItemPedido>(detalles, (r) => ({
    idProducto: r.id_producto,
    nombreProducto: r.nombre_producto,
    presentacion: r.presentacion,
    cantidad: Number(r.cantidad),
    precioUnitario: Number(r.precio_unitario),
  }));
  const cambios = porPedido<CambioEstado>(historial, (r) => ({
    estado: r.estado,
    nota: r.nota,
    fechaHora: new Date(r.fecha_hora).toISOString(),
  }));

  return filas.map((f) => filaAPedido(f, items.get(f.id) ?? [], cambios.get(f.id) ?? []));
};

export const listarPedidos = async (estado?: string): Promise<Pedido[]> => {
  const valido = estado && ORDEN_ESTADOS.includes(estado as EstadoOrden);
  const [filas] = await db.query<RowDataPacket[]>(
    `${SELECT_PEDIDO} ${valido ? 'AND o.estado = ?' : ''} ORDER BY o.id DESC LIMIT 200`,
    valido ? [estado] : []
  );
  return armarPedidos(filas);
};

export const obtenerPedido = async (id: number): Promise<Pedido | null> => {
  const [filas] = await db.query<RowDataPacket[]>(`${SELECT_PEDIDO} AND o.id = ?`, [id]);
  return (await armarPedidos(filas))[0] ?? null;
};

export const obtenerPedidoPorToken = async (token: string): Promise<Pedido | null> => {
  const [filas] = await db.query<RowDataPacket[]>(`${SELECT_PEDIDO} AND o.token_resena = ?`, [token]);
  return (await armarPedidos(filas))[0] ?? null;
};

const generarNumero = () => `OP-${Math.floor(100000 + Math.random() * 900000)}`;

/**
 * Crea el pedido y descuenta el inventario de cada presentacion vendida.
 * El descuento usa una condicion en el propio UPDATE (stock >= cantidad), asi
 * que si dos clientes compran la ultima unidad al tiempo, solo una pasa.
 */
export const crearPedidoDb = async (entrada: PedidoInput): Promise<Pedido> => {
  const conn: PoolConnection = await db.getConnection();
  try {
    await conn.beginTransaction();

    let subtotal = 0;
    const detalles: Array<ItemPedido & { idVariante: number }> = [];

    for (const item of entrada.items) {
      const [filas] = await conn.query<RowDataPacket[]>(
        `SELECT p.id, p.nombre, p.precio, v.id AS id_variante, v.stock
           FROM productos p
           INNER JOIN product_variants v ON v.id_producto = p.id AND v.estado_regis = 'ACTIVO'
          WHERE p.id = ? AND p.estado_regis = 'ACTIVO' AND v.presentacion = ?`,
        [item.idProducto, item.presentacion]
      );

      if (filas.length === 0) {
        throw new ErrorPedido(
          `Uno de los productos de tu carrito (presentación ${item.presentacion}) ya no está disponible. ` +
            `Quítalo del carrito e intenta de nuevo.`
        );
      }

      const fila = filas[0];
      if (Number(fila.stock) < item.cantidad) {
        throw new ErrorPedido(
          `Solo quedan ${fila.stock} unidades de ${fila.nombre} (${item.presentacion})`
        );
      }

      const precio = Number(fila.precio);
      subtotal += precio * item.cantidad;
      detalles.push({
        idProducto: Number(fila.id),
        nombreProducto: fila.nombre,
        presentacion: item.presentacion,
        cantidad: item.cantidad,
        precioUnitario: precio,
        idVariante: Number(fila.id_variante),
      });
    }

    const total = subtotal + entrada.costoEnvio;
    const estado = estadoInicial(entrada.metodoPago);

    // El numero es visible para el cliente, asi que se reintenta si choca
    let numero = generarNumero();
    let orden: ResultSetHeader | null = null;
    for (let intento = 0; intento < 5 && !orden; intento++) {
      try {
        const [res] = await conn.query<ResultSetHeader>(
          `INSERT INTO ordenes
             (numero, nombre, apellido, ciudad, direccion_envio, telefono, notas,
              metodo_pago, canal, estado, subtotal, costo_envio, total,
              estado_regis, fecha_crecion, hora_de_crecion)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', CURDATE(), CURTIME())`,
          [
            numero, entrada.nombre, entrada.apellido, entrada.ciudad, entrada.direccionEnvio,
            entrada.telefono, entrada.notas ?? null, entrada.metodoPago, entrada.canal ?? 'Web',
            estado, subtotal, entrada.costoEnvio, total,
          ]
        );
        orden = res;
      } catch (e) {
        if ((e as { code?: string }).code === 'ER_DUP_ENTRY') numero = generarNumero();
        else throw e;
      }
    }
    if (!orden) throw new ErrorPedido('No se pudo generar el número de pedido');

    for (const d of detalles) {
      await conn.query(
        `INSERT INTO detalle_ordenes
           (id_orden, id_producto, nombre_producto, presentacion, cantidad, precio_unitario, estado_regis)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')`,
        [orden.insertId, d.idProducto, d.nombreProducto, d.presentacion, d.cantidad, d.precioUnitario]
      );

      const [res] = await conn.query<ResultSetHeader>(
        `UPDATE product_variants SET stock = stock - ? WHERE id = ? AND stock >= ?`,
        [d.cantidad, d.idVariante, d.cantidad]
      );
      if (res.affectedRows === 0) {
        throw new ErrorPedido(`Se agotó ${d.nombreProducto} (${d.presentacion}) mientras comprabas`);
      }
    }

    await conn.query(
      `INSERT INTO historial_estados (id_orden, estado, nota) VALUES (?, ?, ?)`,
      [orden.insertId, estado, 'Pedido creado']
    );

    await conn.commit();
    const creado = await obtenerPedido(orden.insertId);
    if (!creado) throw new Error('El pedido se creó pero no se pudo leer');
    return creado;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

/** Devuelve el inventario de un pedido cancelado. */
const reponerStock = async (conn: PoolConnection, idOrden: number) => {
  await conn.query(
    `UPDATE product_variants v
       INNER JOIN detalle_ordenes d
          ON d.id_producto = v.id_producto AND d.presentacion = v.presentacion
        SET v.stock = v.stock + d.cantidad
      WHERE d.id_orden = ?`,
    [idOrden]
  );
};

export const cambiarEstado = async (
  id: number,
  nuevo: EstadoOrden,
  nota?: string
): Promise<Pedido | null> => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [filas] = await conn.query<RowDataPacket[]>(
      `SELECT estado, token_resena FROM ordenes WHERE id = ? AND estado_regis = 'ACTIVO' FOR UPDATE`,
      [id]
    );
    if (filas.length === 0) {
      await conn.rollback();
      return null;
    }

    const actual = filas[0].estado as EstadoOrden;
    if (actual === nuevo) {
      await conn.rollback();
      throw new ErrorPedido('El pedido ya está en ese estado');
    }
    if (!puedeAvanzarA(actual, nuevo)) {
      await conn.rollback();
      throw new ErrorPedido(`No se puede pasar de ${actual} a ${nuevo}`);
    }

    // Al entregar se genera el enlace de reseña (una sola vez por pedido)
    const token =
      nuevo === 'ENTREGADO' && !filas[0].token_resena
        ? randomUUID().replace(/-/g, '') + randomBytes(4).toString('hex')
        : filas[0].token_resena;

    await conn.query(`UPDATE ordenes SET estado = ?, token_resena = ? WHERE id = ?`, [nuevo, token, id]);

    if (nuevo === 'CANCELADO') await reponerStock(conn, id);

    await conn.query(`INSERT INTO historial_estados (id_orden, estado, nota) VALUES (?, ?, ?)`, [
      id,
      nuevo,
      nota?.slice(0, 255) ?? null,
    ]);

    await conn.commit();
    return obtenerPedido(id);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// --- AJUSTES DE PAGO ---

const CLAVES: Record<keyof AjustesPago, string> = {
  nequiNumero: 'nequi_numero',
  nequiQr: 'nequi_qr',
  daviplataNumero: 'daviplata_numero',
  daviplataQr: 'daviplata_qr',
  whatsappNumero: 'whatsapp_numero',
};

export const leerAjustes = async (): Promise<AjustesPago> => {
  const [filas] = await db.query<RowDataPacket[]>(`SELECT clave, valor FROM ajustes`);
  const mapa = new Map(filas.map((f) => [f.clave, f.valor]));
  return Object.fromEntries(
    Object.entries(CLAVES).map(([campo, clave]) => [campo, mapa.get(clave) ?? ''])
  ) as unknown as AjustesPago;
};

export const guardarAjustesDb = async (entrada: Partial<AjustesPago>): Promise<AjustesPago> => {
  for (const [campo, clave] of Object.entries(CLAVES)) {
    const valor = entrada[campo as keyof AjustesPago];
    if (valor === undefined) continue;
    await db.query(
      `INSERT INTO ajustes (clave, valor) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
      [clave, String(valor).slice(0, 500)]
    );
  }
  return leerAjustes();
};
