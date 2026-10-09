import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { db } from '@/lib/db';
import { crearProducto, filaAProducto, leerEntrada, SELECT_PRODUCTO } from '@/lib/productos-db';
import { ErrorAuth, exigir } from '@/lib/auth';

/**
 * GET /api/products
 *
 * Filtros (todos opcionales):
 *   ?href=/skincare/cremas   productos de esa subcategoria
 *   ?categoria=skincare      productos de toda una categoria
 *   ?lanzamientos=1          solo los marcados como nuevo lanzamiento
 *   ?q=serum                 busca en nombre, descripcion y subcategoria
 *   ?limit=50                tope de resultados (maximo 100)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const href = searchParams.get('href');
    const categoria = searchParams.get('categoria');
    const lanzamientos = searchParams.get('lanzamientos') === '1';
    const q = searchParams.get('q');
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 100);

    const condiciones: string[] = [`p.estado_regis = 'ACTIVO'`];
    const valores: (string | number)[] = [];

    if (href) {
      // /skincare/cremas -> categoria "skincare", subcategoria "cremas"
      const [, catSlug, subSlug] = href.split('/');
      if (!catSlug || !subSlug) {
        return NextResponse.json({ success: false, error: 'href invalido' }, { status: 400 });
      }
      condiciones.push('c.slug = ?', 's.slug = ?');
      valores.push(catSlug, subSlug);
    } else if (categoria) {
      condiciones.push('c.slug = ?');
      valores.push(categoria.toLowerCase());
    }

    if (lanzamientos) condiciones.push('p.es_lanzamiento = 1');

    if (q) {
      condiciones.push('(p.nombre LIKE ? OR p.descripcion LIKE ? OR s.nombre_subcat LIKE ? OR c.nombre_cat LIKE ?)');
      const like = `%${q}%`;
      valores.push(like, like, like, like);
    }

    const [filas] = await db.query<RowDataPacket[]>(
      `${SELECT_PRODUCTO}
       WHERE ${condiciones.join(' AND ')}
       ORDER BY p.id DESC
       LIMIT ?`,
      [...valores, limit]
    );

    return NextResponse.json({ success: true, data: filas.map(filaAProducto) });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al conectar con la base de datos' },
      { status: 500 }
    );
  }
}

/** POST /api/products — crea un producto con sus presentaciones. */
export async function POST(request: Request) {
  let entrada;
  let yo;
  try {
    yo = await exigir('catalogo');
    entrada = leerEntrada(await request.json());
  } catch (error) {
    if (error instanceof ErrorAuth) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }

  try {
    const producto = await crearProducto(entrada, yo.id);
    return NextResponse.json({ success: true, data: producto }, { status: 201 });
  } catch (error) {
    const mensaje = (error as Error).message;
    const esDeDatos = mensaje.includes('subcategoria');
    console.error('Error al crear producto:', error);
    return NextResponse.json(
      { success: false, error: esDeDatos ? mensaje : 'Error al registrar el producto' },
      { status: esDeDatos ? 400 : 500 }
    );
  }
}
