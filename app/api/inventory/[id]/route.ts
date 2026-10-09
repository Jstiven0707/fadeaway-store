import { NextResponse } from 'next/server';
import { ErrorAuth, exigir } from '@/lib/auth';
import { listarMovimientos } from '@/lib/inventario-db';

/** GET /api/inventory/:idVariante — historial de esa presentacion. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const idVariante = Number(id);

  if (!Number.isInteger(idVariante) || idVariante <= 0) {
    return NextResponse.json({ success: false, error: 'Presentación no válida' }, { status: 400 });
  }

  try {
    await exigir();
    return NextResponse.json({ success: true, data: await listarMovimientos(idVariante) });
  } catch (error) {
    if (error instanceof ErrorAuth) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error al leer los movimientos:', error);
    return NextResponse.json({ success: false, error: 'Error en la base de datos' }, { status: 500 });
  }
}
