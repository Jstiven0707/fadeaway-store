import { NextResponse } from 'next/server';
import { actualizarProducto, eliminarProducto, leerEntrada, obtenerProducto } from '@/lib/productos-db';
import { ErrorAuth, exigir } from '@/lib/auth';

// En Next 16 params es una Promise y hay que esperarla.
type Contexto = { params: Promise<{ id: string }> };

const leerId = async (ctx: Contexto) => {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** GET /api/products/[id] */
export async function GET(_request: Request, ctx: Contexto) {
  const id = await leerId(ctx);
  if (!id) return NextResponse.json({ success: false, error: 'Id invalido' }, { status: 400 });

  try {
    const producto = await obtenerProducto(id);
    if (!producto) {
      return NextResponse.json({ success: false, error: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: producto });
  } catch (error) {
    console.error('Error al leer el producto:', error);
    return NextResponse.json(
      { success: false, error: 'Error al conectar con la base de datos' },
      { status: 500 }
    );
  }
}

/** PUT /api/products/[id] — reemplaza datos y presentaciones. */
export async function PUT(request: Request, ctx: Contexto) {
  const id = await leerId(ctx);
  if (!id) return NextResponse.json({ success: false, error: 'Id invalido' }, { status: 400 });

  let entrada;
  let yo;
  try {
    yo = await exigir('catalogo');
    entrada = leerEntrada(await request.json());
  } catch (error) {
    if (error instanceof ErrorAuth) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }

  try {
    const producto = await actualizarProducto(id, entrada, yo.id);
    if (!producto) {
      return NextResponse.json({ success: false, error: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: producto });
  } catch (error) {
    const mensaje = (error as Error).message;
    const esDeDatos = mensaje.includes('subcategoria');
    console.error('Error al actualizar el producto:', error);
    return NextResponse.json(
      { success: false, error: esDeDatos ? mensaje : 'Error al actualizar el producto' },
      { status: esDeDatos ? 400 : 500 }
    );
  }
}

/** DELETE /api/products/[id] — baja logica (estado_regis = INACTIVO). */
export async function DELETE(_request: Request, ctx: Contexto) {
  const id = await leerId(ctx);
  if (!id) return NextResponse.json({ success: false, error: 'Id invalido' }, { status: 400 });

  try {
    await exigir('catalogo');
    const ok = await eliminarProducto(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ErrorAuth) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error al eliminar el producto:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar el producto' },
      { status: 500 }
    );
  }
}
