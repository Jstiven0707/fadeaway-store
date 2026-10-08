import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Listar subcategorías reales de la BD
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId');

  try {
    let query = `
      SELECT 
        s.id, 
        s.nombre_subcat AS name, 
        s.image_url AS image, 
        s.id_categoria AS categoryId,
        c.nombre_cat AS categoryName
      FROM subcategorias s
      JOIN categorias c ON s.id_categoria = c.id
      WHERE s.estado_regis = 'ACTIVO' AND c.estado_regis = 'ACTIVO'
    `;

    const values: any[] = [];

    if (categoryId) {
      query += ` AND s.id_categoria = ?`;
      values.push(categoryId);
    }

    query += ` ORDER BY s.id DESC`;

    const [rows]: any = await db.query(query, values);

    // Si no hay subcategorías, devuelve un array vacío [] estrictamente
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Error al obtener subcategorías:', error.message);
    return NextResponse.json([]);
  }
}

// POST: Crear una subcategoría real vinculada a un módulo
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_categoria, nombre_subcat, image_url } = body;

    if (!id_categoria || !nombre_subcat) {
      return NextResponse.json({ error: 'La categoría y el nombre son obligatorios' }, { status: 400 });
    }

    const fecha_crecion = new Date().toISOString().split('T')[0];
    const hora_de_crecion = new Date().toTimeString().split(' ')[0];

    const [result]: any = await db.query(
      `INSERT INTO subcategorias (id_categoria, nombre_subcat, image_url, estado_regis, fecha_crecion, hora_de_crecion) 
       VALUES (?, ?, ?, 'ACTIVO', ?, ?)`,
      [id_categoria, nombre_subcat, image_url || null, fecha_crecion, hora_de_crecion]
    );

    return NextResponse.json({ 
      success: true, 
      id: result.insertId, 
      message: 'Subcategoría creada exitosamente' 
    });
  } catch (error: any) {
    console.error('Error al crear subcategoría:', error.message);
    return NextResponse.json({ error: 'Error al guardar la subcategoría' }, { status: 500 });
  }
}