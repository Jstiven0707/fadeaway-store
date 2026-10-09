import { NextResponse } from 'next/server';
import { ErrorAuth, exigir } from '@/lib/auth';
import { ErrorInventario, listarInventario, moverInventario, resumenInventario } from '@/lib/inventario-db';
import { TIPOS_MOVIMIENTO, UMBRAL_BAJO, type TipoMovimiento } from '@/lib/inventario';

/**
 * GET /api/inventory?buscar=&bajos=1
 *
 * Consultar el stock lo puede hacer cualquiera con sesion, incluido un asesor:
 * necesita saber si hay existencias antes de prometerle algo a un cliente.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    await exigir();
    const [filas, resumen] = await Promise.all([
      listarInventario({
        buscar: searchParams.get('buscar')?.trim() || undefined,
        soloBajos: searchParams.get('bajos') === '1',
        umbral: UMBRAL_BAJO,
      }),
      resumenInventario(UMBRAL_BAJO),
    ]);
    return NextResponse.json({ success: true, data: { filas, resumen } });
  } catch (error) {
    if (error instanceof ErrorAuth) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error al listar el inventario:', error);
    return NextResponse.json({ success: false, error: 'Error en la base de datos' }, { status: 500 });
  }
}

/** POST /api/inventory — entrada, salida o ajuste hecho a mano. */
export async function POST(request: Request) {
  try {
    // Mover stock es tocar el catalogo: el asesor mira pero no corrige
    const yo = await exigir('catalogo');
    const body = (await request.json()) as {
      idVariante?: number;
      tipo?: string;
      cantidad?: number;
      motivo?: string;
    };

    const tipo = body.tipo as TipoMovimiento;
    if (!tipo || !(tipo in TIPOS_MOVIMIENTO)) {
      return NextResponse.json({ success: false, error: 'Tipo de movimiento no válido' }, { status: 400 });
    }
    if (!Number.isInteger(body.idVariante)) {
      return NextResponse.json({ success: false, error: 'Falta la presentación' }, { status: 400 });
    }

    const stock = await moverInventario({
      idVariante: Number(body.idVariante),
      tipo,
      cantidad: Number(body.cantidad),
      motivo: String(body.motivo ?? ''),
      idUsuario: yo.id,
    });

    return NextResponse.json({ success: true, data: { stock } });
  } catch (error) {
    if (error instanceof ErrorAuth) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    if (error instanceof ErrorInventario) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Error al mover inventario:', error);
    return NextResponse.json({ success: false, error: 'No se pudo mover el inventario' }, { status: 500 });
  }
}
