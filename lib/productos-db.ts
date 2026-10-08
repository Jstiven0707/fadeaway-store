// ---------------------------------------------------------------------------
// CONSULTAS DE PRODUCTOS CONTRA MySQL
//
// Un producto vive repartido en dos tablas: productos (datos generales) y
// product_variants (una fila por presentacion, con su propio stock). Este
// archivo arma y desarma esa relacion para que las rutas de API trabajen con
// el tipo Product que entiende el front.
// ---------------------------------------------------------------------------

import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { db } from '@/lib/db';
import type { Presentacion, Product, ProductInput } from '@/lib/products';

export const SELECT_PRODUCTO = `
  SELECT p.id, p.nombre, p.descripcion, p.precio, p.image_url, p.es_lanzamiento,
         s.nombre_subcat, s.slug AS sub_slug,
         c.nombre_cat, c.slug AS cat_slug,
         (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', v.id, 'nombre', v.presentacion, 'stock', v.stock))
            FROM product_variants v
           WHERE v.id_producto = p.id AND v.estado_regis = 'ACTIVO') AS presentaciones
  FROM productos p
  INNER JOIN subcategorias s ON p.id_subcategoria = s.id
  INNER JOIN categorias c ON s.id_categoria = c.id
`;

type FilaPresentacion = { id: number; nombre: string; stock: number };

/** mysql2 puede devolver la columna JSON ya parseada o como texto. */
const parsearPresentaciones = (valor: unknown): Presentacion[] => {
  if (!valor) return [];
  const bruto = typeof valor === 'string' ? JSON.parse(valor) : valor;
  if (!Array.isArray(bruto)) return [];
  return (bruto as FilaPresentacion[])
    .sort((a, b) => a.id - b.id) // JSON_ARRAYAGG no garantiza el orden
    .map((v) => ({ nombre: v.nombre, stock: Number(v.stock) }));
};

export const filaAProducto = (r: RowDataPacket): Product => {
  const presentations = parsearPresentaciones(r.presentaciones);
  const stock = presentations.reduce((acc, p) => acc + p.stock, 0);

  return {
    id: Number(r.id),
    name: r.nombre,
    // El slug de la categoria y la clave del menu son lo mismo en mayusculas
    category: String(r.cat_slug).toUpperCase(),
    subcategory: {
      name: r.nombre_subcat,
      href: `/${r.cat_slug}/${r.sub_slug}`,
    },
    price: Number(r.precio),
    description: r.descripcion ?? '',
    presentations,
    stock,
    image: r.image_url ?? '',
    status: stock > 0 ? 'Disponible' : 'Agotado',
    isNewRelease: Boolean(r.es_lanzamiento),
  };
};

/** Valida y normaliza el cuerpo de un POST/PUT. Lanza si algo no cuadra. */
export const leerEntrada = (body: unknown): ProductInput => {
  const b = (body ?? {}) as Record<string, unknown>;

  const href = String(b.subcategoryHref ?? '').trim().toLowerCase();
  if (!/^\/[a-z0-9-]+\/[a-z0-9-]+$/.test(href)) {
    throw new Error('Elige una subcategoria valida');
  }

  const name = String(b.name ?? '').trim();
  if (!name) throw new Error('El nombre del producto es obligatorio');
  if (name.length > 150) throw new Error('El nombre no puede superar 150 caracteres');

  const price = Number(b.price);
  if (!Number.isFinite(price) || price < 0) throw new Error('El precio no es valido');

  const image = String(b.image ?? '').trim();
  if (image.length > 255) throw new Error('La ruta de la imagen es demasiado larga');

  const brutas = Array.isArray(b.presentations) ? b.presentations : [];
  const presentations: Presentacion[] = brutas
    .map((p) => {
      const o = (p ?? {}) as Record<string, unknown>;
      return { nombre: String(o.nombre ?? '').trim(), stock: Math.trunc(Number(o.stock) || 0) };
    })
    .filter((p) => p.nombre.length > 0);

  if (presentations.length === 0) {
    throw new Error('Agrega al menos una presentacion');
  }
  if (presentations.some((p) => p.nombre.length > 40)) {
    throw new Error('Cada presentacion debe tener maximo 40 caracteres');
  }
  if (presentations.some((p) => p.stock < 0)) {
    throw new Error('El stock no puede ser negativo');
  }

  const vistos = new Set<string>();
  for (const p of presentations) {
    const clave = p.nombre.toLowerCase();
    if (vistos.has(clave)) throw new Error(`La presentacion "${p.nombre}" esta repetida`);
    vistos.add(clave);
  }

  return {
    subcategoryHref: href,
    name,
    description: String(b.description ?? '').trim(),
    price,
    image,
    isNewRelease: b.isNewRelease === true,
    presentations,
  };
};

const idDeSubcategoria = async (conn: PoolConnection, href: string): Promise<number> => {
  const [, catSlug, subSlug] = href.split('/');
  const [filas] = await conn.query<RowDataPacket[]>(
    `SELECT s.id
       FROM subcategorias s
       INNER JOIN categorias c ON s.id_categoria = c.id
      WHERE c.slug = ? AND s.slug = ? AND s.estado_regis = 'ACTIVO'`,
    [catSlug, subSlug]
  );
  if (filas.length === 0) {
    throw new Error(`La subcategoria ${href} no existe en la base de datos`);
  }
  return filas[0].id;
};

const guardarPresentaciones = async (
  conn: PoolConnection,
  idProducto: number,
  presentations: Presentacion[]
) => {
  // Se reemplazan completas: es mas simple y confiable que calcular el diff.
  // Ninguna otra tabla apunta a product_variants, asi que borrarlas es seguro.
  await conn.query('DELETE FROM product_variants WHERE id_producto = ?', [idProducto]);
  await conn.query(
    `INSERT INTO product_variants (id_producto, presentacion, stock, estado_regis)
     VALUES ${presentations.map(() => '(?, ?, ?, \'ACTIVO\')').join(', ')}`,
    presentations.flatMap((p) => [idProducto, p.nombre, p.stock])
  );
};

export const obtenerProducto = async (id: number): Promise<Product | null> => {
  const [filas] = await db.query<RowDataPacket[]>(`${SELECT_PRODUCTO} WHERE p.id = ?`, [id]);
  return filas.length ? filaAProducto(filas[0]) : null;
};

export const crearProducto = async (entrada: ProductInput): Promise<Product> => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const idSub = await idDeSubcategoria(conn, entrada.subcategoryHref);

    const [res] = await conn.query<ResultSetHeader>(
      `INSERT INTO productos
         (id_subcategoria, nombre, descripcion, precio, image_url, es_lanzamiento,
          estado_regis, fecha_crecion, hora_de_crecion)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO', CURDATE(), CURTIME())`,
      [idSub, entrada.name, entrada.description, entrada.price, entrada.image || null, entrada.isNewRelease]
    );

    await guardarPresentaciones(conn, res.insertId, entrada.presentations);
    await conn.commit();

    const producto = await obtenerProducto(res.insertId);
    if (!producto) throw new Error('El producto se creo pero no se pudo leer');
    return producto;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const actualizarProducto = async (
  id: number,
  entrada: ProductInput
): Promise<Product | null> => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const idSub = await idDeSubcategoria(conn, entrada.subcategoryHref);

    const [res] = await conn.query<ResultSetHeader>(
      `UPDATE productos
          SET id_subcategoria = ?, nombre = ?, descripcion = ?, precio = ?,
              image_url = ?, es_lanzamiento = ?
        WHERE id = ? AND estado_regis = 'ACTIVO'`,
      [idSub, entrada.name, entrada.description, entrada.price, entrada.image || null, entrada.isNewRelease, id]
    );

    if (res.affectedRows === 0) {
      await conn.rollback();
      return null;
    }

    await guardarPresentaciones(conn, id, entrada.presentations);
    await conn.commit();

    return obtenerProducto(id);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

/** Baja logica: no se borra la fila para no romper el historial de pedidos. */
export const eliminarProducto = async (id: number): Promise<boolean> => {
  const [res] = await db.query<ResultSetHeader>(
    `UPDATE productos SET estado_regis = 'INACTIVO' WHERE id = ? AND estado_regis = 'ACTIVO'`,
    [id]
  );
  return res.affectedRows > 0;
};
