import { NextResponse } from 'next/server';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { db } from '@/lib/db';
import { obtenerPedidoPorToken } from '@/lib/pedidos-db';

/**
 * GET /api/reviews?token=...   datos del pedido para la pagina de reseña
 * GET /api/reviews?producto=5  reseñas publicadas de un producto
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const producto = searchParams.get('producto');

  try {
    if (token) {
      const pedido = await obtenerPedidoPorToken(token);
      if (!pedido || pedido.estado !== 'ENTREGADO') {
        return NextResponse.json({ success: false, error: 'Enlace no válido' }, { status: 404 });
      }

      const [yaHechas] = await db.query<RowDataPacket[]>(
        `SELECT id_producto FROM resenas WHERE id_orden = ? AND estado_regis = 'ACTIVO'`,
        [pedido.id]
      );

      return NextResponse.json({
        success: true,
        data: {
          numero: pedido.numero,
          nombre: pedido.nombre,
          items: pedido.items,
          yaCalificados: yaHechas.map((r) => r.id_producto),
        },
      });
    }

    if (producto) {
      const [filas] = await db.query<RowDataPacket[]>(
        `SELECT id, calificacion, comentario, nombre_cliente, fecha_crecion
           FROM resenas
          WHERE id_producto = ? AND publicada = 1 AND estado_regis = 'ACTIVO'
          ORDER BY id DESC LIMIT 50`,
        [Number(producto)]
      );
      return NextResponse.json({
        success: true,
        data: filas.map((r) => ({
          id: Number(r.id),
          calificacion: Number(r.calificacion),
          comentario: r.comentario,
          nombreCliente: r.nombre_cliente,
          fecha: new Date(r.fecha_crecion).toISOString(),
        })),
      });
    }

    return NextResponse.json({ success: false, error: 'Falta token o producto' }, { status: 400 });
  } catch (error) {
    console.error('Error al leer reseñas:', error);
    return NextResponse.json({ success: false, error: 'Error en la base de datos' }, { status: 500 });
  }
}

/** POST /api/reviews — el cliente califica con el token que recibió. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      calificaciones?: Array<{ idProducto: number; calificacion: number; comentario?: string }>;
    };

    if (!body.token) {
      return NextResponse.json({ success: false, error: 'Falta el enlace' }, { status: 400 });
    }

    const pedido = await obtenerPedidoPorToken(body.token);
    if (!pedido || pedido.estado !== 'ENTREGADO') {
      return NextResponse.json({ success: false, error: 'Enlace no válido' }, { status: 404 });
    }

    const entradas = (body.calificaciones ?? []).filter(
      (c) => Number.isInteger(c.calificacion) && c.calificacion >= 1 && c.calificacion <= 5
    );
    if (entradas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Califica al menos un producto con 1 a 5 estrellas' },
        { status: 400 }
      );
    }

    // Solo se aceptan productos que realmente estaban en ese pedido
    const comprados = new Set(pedido.items.map((i) => i.idProducto));
    for (const c of entradas) {
      if (!comprados.has(c.idProducto)) {
        return NextResponse.json(
          { success: false, error: 'Ese producto no pertenece a tu pedido' },
          { status: 400 }
        );
      }
    }

    let guardadas = 0;
    for (const c of entradas) {
      const [existe] = await db.query<RowDataPacket[]>(
        `SELECT id FROM resenas WHERE id_orden = ? AND id_producto = ?`,
        [pedido.id, c.idProducto]
      );
      if (existe.length > 0) continue; // una reseña por producto y pedido

      await db.query<ResultSetHeader>(
        `INSERT INTO resenas (id_orden, id_producto, calificacion, comentario, nombre_cliente)
         VALUES (?, ?, ?, ?, ?)`,
        [pedido.id, c.idProducto, c.calificacion, (c.comentario ?? '').slice(0, 1000) || null, pedido.nombre]
      );
      guardadas++;
    }

    return NextResponse.json({ success: true, data: { guardadas } }, { status: 201 });
  } catch (error) {
    console.error('Error al guardar la reseña:', error);
    return NextResponse.json({ success: false, error: 'No se pudo guardar tu reseña' }, { status: 500 });
  }
}
