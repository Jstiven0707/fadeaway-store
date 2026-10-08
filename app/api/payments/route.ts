import { NextResponse } from 'next/server';
import { listarPagos } from '@/lib/pedidos-db';

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/payments?desde=2026-10-01&hasta=2026-10-31 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const desde = searchParams.get('desde') ?? '';
  const hasta = searchParams.get('hasta') ?? '';

  if (!ES_FECHA.test(desde) || !ES_FECHA.test(hasta)) {
    return NextResponse.json(
      { success: false, error: 'Indica un rango de fechas válido (AAAA-MM-DD)' },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json({ success: true, data: await listarPagos(desde, hasta) });
  } catch (error) {
    console.error('Error al listar pagos:', error);
    return NextResponse.json({ success: false, error: 'Error en la base de datos' }, { status: 500 });
  }
}
