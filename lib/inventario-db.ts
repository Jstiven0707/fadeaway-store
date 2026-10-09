// ---------------------------------------------------------------------------
// INVENTARIO: SALDOS Y MOVIMIENTOS
//
// El stock vive en product_variants.stock, que es el saldo de hoy. Esta capa
// agrega el *por que* de ese saldo: cada entrada y cada salida queda escrita
// en movimientos_inventario con el saldo que quedo despues.
//
// Regla: nadie toca product_variants.stock sin pasar por registrarMovimiento,
// porque si no el saldo y el historial se separan y ya no cuadran nunca.
// ---------------------------------------------------------------------------

import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { db } from '@/lib/db';
import type { MovimientoInventario, TipoMovimiento, FilaInventario } from '@/lib/inventario';

export class ErrorInventario extends Error {}

/**
 * Mueve el stock de una variante y lo deja escrito en el historial.
 *
 * `cantidad` siempre va en positivo; el signo lo pone `tipo`. Para AJUSTE,
 * `cantidad` es el saldo final que se quiere dejar, no la diferencia: asi el
 * que hace un conteo fisico escribe lo que conto y no tiene que restar.
 *
 * Corre dentro de la transaccion de quien llama, nunca abre la suya.
 */
export const registrarMovimiento = async (
  conn: PoolConnection,
  datos: {
    idVariante: number;
    tipo: TipoMovimiento;
    cantidad: number;
    motivo: string;
    idOrden?: number | null;
    idUsuario?: number | null;
    /** El stock ya se descontó afuera (p. ej. el UPDATE condicional de la venta) */
    yaAplicado?: boolean;
  }
) => {
  const [filas] = await conn.query<RowDataPacket[]>(
    `SELECT stock FROM product_variants WHERE id = ? FOR UPDATE`,
    [datos.idVariante]
  );
  if (filas.length === 0) throw new ErrorInventario('Esa presentación ya no existe');

  const actual = Number(filas[0].stock);
  let saldo = actual;
  let cantidad = datos.cantidad;

  if (datos.tipo === 'AJUSTE') {
    // Lo que se guarda es el movimiento real: cuanto se movio el saldo
    saldo = datos.cantidad;
    cantidad = Math.abs(saldo - actual);
    await conn.query(`UPDATE product_variants SET stock = ? WHERE id = ?`, [saldo, datos.idVariante]);
  } else if (datos.yaAplicado) {
    // La venta ya descontó con su UPDATE condicional; aqui solo se deja el rastro
    saldo = actual;
  } else {
    const signo = datos.tipo === 'ENTRADA' ? 1 : -1;
    saldo = actual + signo * datos.cantidad;
    if (saldo < 0) throw new ErrorInventario('No hay suficiente stock para esa salida');
    await conn.query(`UPDATE product_variants SET stock = ? WHERE id = ?`, [saldo, datos.idVariante]);
  }

  await conn.query(
    `INSERT INTO movimientos_inventario
       (id_variante, tipo, cantidad, saldo, motivo, id_orden, id_usuario)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.idVariante,
      datos.tipo,
      cantidad,
      saldo,
      datos.motivo.slice(0, 120),
      datos.idOrden ?? null,
      datos.idUsuario ?? null,
    ]
  );

  return saldo;
};

/** Busca la variante por producto + presentacion, como la nombran los pedidos. */
export const buscarVariante = async (
  conn: PoolConnection,
  idProducto: number,
  presentacion: string
): Promise<number | null> => {
  const [filas] = await conn.query<RowDataPacket[]>(
    `SELECT id FROM product_variants WHERE id_producto = ? AND presentacion = ?`,
    [idProducto, presentacion]
  );
  return filas.length ? Number(filas[0].id) : null;
};

/**
 * Inventario completo: una fila por presentacion, con lo vendido y la fecha
 * del ultimo movimiento, que es lo que se mira para saber que esta quieto.
 */
export const listarInventario = async (filtro?: {
  buscar?: string;
  soloBajos?: boolean;
  umbral?: number;
}): Promise<FilaInventario[]> => {
  const umbral = filtro?.umbral ?? 5;
  const condiciones = [`p.estado_regis = 'ACTIVO'`, `v.estado_regis = 'ACTIVO'`];
  const valores: Array<string | number> = [];

  if (filtro?.buscar) {
    condiciones.push(`(p.nombre LIKE ? OR v.presentacion LIKE ?)`);
    valores.push(`%${filtro.buscar}%`, `%${filtro.buscar}%`);
  }
  if (filtro?.soloBajos) {
    condiciones.push(`v.stock <= ?`);
    valores.push(umbral);
  }

  const [filas] = await db.query<RowDataPacket[]>(
    `SELECT v.id            AS id_variante,
            v.presentacion,
            v.stock,
            p.id            AS id_producto,
            p.nombre        AS producto,
            p.precio,
            p.image_url,
            s.nombre_subcat AS subcategoria,
            c.nombre_cat    AS categoria,
            (SELECT COALESCE(SUM(m.cantidad), 0)
               FROM movimientos_inventario m
              WHERE m.id_variante = v.id AND m.tipo = 'SALIDA')      AS vendidas,
            (SELECT MAX(m.fecha_hora)
               FROM movimientos_inventario m
              WHERE m.id_variante = v.id)                            AS ultimo_movimiento
       FROM product_variants v
       INNER JOIN productos p      ON p.id = v.id_producto
       INNER JOIN subcategorias s  ON s.id = p.id_subcategoria
       INNER JOIN categorias c     ON c.id = s.id_categoria
      WHERE ${condiciones.join(' AND ')}
      ORDER BY v.stock ASC, p.nombre ASC, v.presentacion ASC`,
    valores
  );

  return filas.map((f) => ({
    idVariante: Number(f.id_variante),
    idProducto: Number(f.id_producto),
    producto: f.producto as string,
    presentacion: f.presentacion as string,
    stock: Number(f.stock),
    precio: Number(f.precio),
    imageUrl: (f.image_url as string) || null,
    categoria: f.categoria as string,
    subcategoria: f.subcategoria as string,
    vendidas: Number(f.vendidas),
    ultimoMovimiento: f.ultimo_movimiento ? new Date(f.ultimo_movimiento as Date).toISOString() : null,
  }));
};

/** Historial de una presentacion, del mas reciente al mas viejo. */
export const listarMovimientos = async (
  idVariante: number,
  limite = 60
): Promise<MovimientoInventario[]> => {
  const [filas] = await db.query<RowDataPacket[]>(
    `SELECT m.id, m.tipo, m.cantidad, m.saldo, m.motivo, m.fecha_hora,
            o.numero AS numero_pedido, u.nombre AS usuario
       FROM movimientos_inventario m
       LEFT JOIN ordenes o  ON o.id = m.id_orden
       LEFT JOIN usuarios u ON u.id = m.id_usuario
      WHERE m.id_variante = ?
      ORDER BY m.fecha_hora DESC, m.id DESC
      LIMIT ?`,
    [idVariante, limite]
  );

  return filas.map((f) => ({
    id: Number(f.id),
    tipo: f.tipo as TipoMovimiento,
    cantidad: Number(f.cantidad),
    saldo: Number(f.saldo),
    motivo: f.motivo as string,
    numeroPedido: (f.numero_pedido as string) || null,
    usuario: (f.usuario as string) || null,
    fechaHora: new Date(f.fecha_hora as Date).toISOString(),
  }));
};

/**
 * Entrada, salida o ajuste hecho a mano desde el panel. Abre su propia
 * transaccion porque aqui el movimiento es el trabajo completo.
 */
export const moverInventario = async (datos: {
  idVariante: number;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
  idUsuario: number;
}) => {
  if (!Number.isInteger(datos.cantidad) || datos.cantidad < 0) {
    throw new ErrorInventario('La cantidad debe ser un número entero de 0 o más');
  }
  if (datos.tipo !== 'AJUSTE' && datos.cantidad === 0) {
    throw new ErrorInventario('La cantidad no puede ser cero');
  }
  if (!datos.motivo?.trim()) {
    throw new ErrorInventario('Escribe el motivo del movimiento');
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const saldo = await registrarMovimiento(conn, { ...datos, motivo: datos.motivo.trim() });
    await conn.commit();
    return saldo;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

/** Totales para las tarjetas de arriba del modulo. */
export const resumenInventario = async (umbral = 5) => {
  const [filas] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*)                                        AS presentaciones,
            COALESCE(SUM(v.stock), 0)                       AS unidades,
            COALESCE(SUM(v.stock * p.precio), 0)            AS valorizado,
            SUM(CASE WHEN v.stock = 0 THEN 1 ELSE 0 END)    AS agotadas,
            SUM(CASE WHEN v.stock > 0 AND v.stock <= ? THEN 1 ELSE 0 END) AS bajas
       FROM product_variants v
       INNER JOIN productos p ON p.id = v.id_producto
      WHERE v.estado_regis = 'ACTIVO' AND p.estado_regis = 'ACTIVO'`,
    [umbral]
  );

  const f = filas[0] ?? {};
  return {
    presentaciones: Number(f.presentaciones ?? 0),
    unidades: Number(f.unidades ?? 0),
    valorizado: Number(f.valorizado ?? 0),
    agotadas: Number(f.agotadas ?? 0),
    bajas: Number(f.bajas ?? 0),
    umbral,
  };
};

/** Devuelve `SALIDA`/`ENTRADA` segun si el movimiento suma o resta. */
export const esEntrada = (tipo: TipoMovimiento) => tipo === 'ENTRADA';
