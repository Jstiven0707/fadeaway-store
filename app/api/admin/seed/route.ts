import { NextResponse } from 'next/server';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { db } from '@/lib/db';
import { CATEGORIES_PRINCIPALES, categoryLabel, getSubcategoriesForCategory } from '@/lib/menu';
import { ErrorAuth, exigir } from '@/lib/auth';

/**
 * Pobla categorias y subcategorias en MySQL a partir de lib/menu.ts.
 *
 * El menu sigue viviendo en el codigo (es parte del diseño de la tienda),
 * pero la base necesita estas filas porque productos.id_subcategoria es
 * llave foranea contra subcategorias.
 *
 * Es idempotente: se puede correr las veces que haga falta. Si una
 * categoria o subcategoria ya existe, actualiza el nombre en vez de
 * duplicarla.
 */
export async function POST() {
  // Mientras las rutas de admin no tengan autenticacion, esto solo corre
  // en desarrollo. No queremos un endpoint publico que escriba en la base.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'No disponible en produccion' },
      { status: 403 }
    );
  }

  try {
    await exigir('catalogo');
  } catch (error) {
    if (error instanceof ErrorAuth) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    throw error;
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const resumen: Array<{ categoria: string; subcategorias: number }> = [];

    for (const key of CATEGORIES_PRINCIPALES) {
      const subs = getSubcategoriesForCategory(key);
      // El slug de la categoria sale del href: /perfumeria/mujer -> perfumeria
      const catSlug = subs[0]?.href.split('/')[1];
      if (!catSlug) continue;

      await conn.query<ResultSetHeader>(
        `INSERT INTO categorias (nombre_cat, slug, estado_regis, fecha_crecion, hora_de_crecion)
         VALUES (?, ?, 'ACTIVO', CURDATE(), CURTIME())
         ON DUPLICATE KEY UPDATE nombre_cat = VALUES(nombre_cat), estado_regis = 'ACTIVO'`,
        [categoryLabel(key), catSlug]
      );

      const [[cat]] = await conn.query<RowDataPacket[]>(
        `SELECT id FROM categorias WHERE slug = ?`,
        [catSlug]
      );

      for (const sub of subs) {
        const subSlug = sub.href.split('/')[2];
        if (!subSlug) continue;

        await conn.query<ResultSetHeader>(
          `INSERT INTO subcategorias (id_categoria, nombre_subcat, slug, estado_regis, fecha_crecion, hora_de_crecion)
           VALUES (?, ?, ?, 'ACTIVO', CURDATE(), CURTIME())
           ON DUPLICATE KEY UPDATE nombre_subcat = VALUES(nombre_subcat), estado_regis = 'ACTIVO'`,
          [cat.id, sub.label, subSlug]
        );
      }

      resumen.push({ categoria: categoryLabel(key), subcategorias: subs.length });
    }

    await conn.commit();

    const [[totales]] = await conn.query<RowDataPacket[]>(
      `SELECT (SELECT COUNT(*) FROM categorias) AS categorias,
              (SELECT COUNT(*) FROM subcategorias) AS subcategorias`
    );

    return NextResponse.json({ success: true, resumen, totales });
  } catch (error) {
    await conn.rollback();
    console.error('Error poblando el menu:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo poblar categorias y subcategorias' },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
