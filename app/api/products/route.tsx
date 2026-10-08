// app/api/products/route.ts
import { NextResponse } from 'next/server';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoriaId = searchParams.get('categoria');
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);

    let query = `
      SELECT p.id, p.nombre, p.descripcion, p.precio, p.image_url,
             p.id_subcategoria, s.nombre_subcat, c.nombre_cat
      FROM productos p
      INNER JOIN subcategorias s ON p.id_subcategoria = s.id
      INNER JOIN categorias c ON s.id_categoria = c.id
      WHERE p.estado_regis = 'ACTIVO'
    `;
    const params: (string | number)[] = [];

    if (categoriaId) {
      query += ` AND s.id_categoria = ?`;
      params.push(categoriaId);
    }

    query += ` ORDER BY p.id DESC LIMIT ?`;
    params.push(limit);

    const [rows] = await db.query<RowDataPacket[]>(query, params);

    const data = rows.map((r) => ({
      id: r.id,
      name: r.nombre,
      description: r.descripcion,
      price: Number(r.precio),
      image: r.image_url ?? '',
      category: r.nombre_cat,
      subcategory: r.nombre_subcat,
      subcategoryId: r.id_subcategoria,
    }));

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al conectar con la base de datos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { idSubcategoria, nombre, descripcion, precio, imageUrl } = await request.json();

    if (!idSubcategoria || !nombre || precio === undefined || Number.isNaN(Number(precio))) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos obligatorios o el precio no es válido' },
        { status: 400 }
      );
    }

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO productos
         (id_subcategoria, nombre, descripcion, precio, image_url, fecha_crecion, hora_de_crecion)
       VALUES (?, ?, ?, ?, ?, CURDATE(), CURTIME())`,
      [idSubcategoria, nombre, descripcion || '', Number(precio), imageUrl || null]
    );

    return NextResponse.json(
      { success: true, message: 'Producto creado', productId: result.insertId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear producto:', error);
    return NextResponse.json(
      { success: false, error: 'Error al registrar el producto' },
      { status: 500 }
    );
  }
}