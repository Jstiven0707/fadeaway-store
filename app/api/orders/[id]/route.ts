import { NextResponse } from 'next/server';
import { ErrorPedido, cambiarEstado, eliminarPedido, obtenerPedido } from '@/lib/pedidos-db';
import { ErrorAuth, exigir } from '@/lib/auth';
import { ORDEN_ESTADOS, type EstadoOrden } from '@/lib/pedidos';

// En Next 16 params es una Promise.
type Contexto = { params: Promise<{ id: string }> };

const leerId = async (ctx: Contexto) => {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export async function GET(_request: Request, ctx: Contexto) {
  const id = await leerId(ctx);
  if (!id) return NextResponse.json({ success: false, error: 'Id inválido' }, { status: 400 });

  try {
    await exigir('pedidos');
    const pedido = await obtenerPedido(id);
    if (!pedido) {
      return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: pedido });
  } catch (error) {
    if (error instanceof ErrorAuth) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error al leer el pedido:', error);
    return NextResponse.json({ success: false, error: 'Error en la base de datos' }, { status: 500 });
  }
}

/** PATCH /api/orders/[id] — mueve el pedido al siguiente estado. */
export async function PATCH(request: Request, ctx: Contexto) {
  const id = await leerId(ctx);
  if (!id) return NextResponse.json({ success: false, error: 'Id inválido' }, { status: 400 });

  try {
    await exigir('pedidos');
    const body = (await request.json()) as { estado?: string; nota?: string; referenciaPago?: string };
    const estado = body.estado as EstadoOrden;

    if (!estado || !ORDEN_ESTADOS.includes(estado)) {
      return NextResponse.json({ success: false, error: 'Estado inválido' }, { status: 400 });
    }

    const pedido = await cambiarEstado(id, estado, body.nota, body.referenciaPago);
    if (!pedido) {
      return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: pedido });
  } catch (error) {
    if (error instanceof ErrorAuth) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    if (error instanceof ErrorPedido) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Error al cambiar el estado:', error);
    return NextResponse.json({ success: false, error: 'No se pudo cambiar el estado' }, { status: 500 });
  }
}

/**
 * DELETE /api/orders/[id] — elimina un pedido.
 *
 * Reservado al perfil owner: borrar un pedido mueve inventario y borra el
 * pago asociado, asi que no es algo que deba poder hacer cualquiera.
 */
export async function DELETE(_request: Request, ctx: Contexto) {
  const id = await leerId(ctx);
  if (!id) return NextResponse.json({ success: false, error: 'Id inválido' }, { status: 400 });

  try {
    await exigir('eliminarPedidos');
    const ok = await eliminarPedido(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    if (error instanceof ErrorAuth) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error al eliminar el pedido:', error);
    return NextResponse.json({ success: false, error: 'No se pudo eliminar el pedido' }, { status: 500 });
  }
}
