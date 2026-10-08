import { NextResponse } from 'next/server';
import { ErrorPedido, crearPedidoDb, leerEntradaPedido, listarPedidos } from '@/lib/pedidos-db';

/** GET /api/orders?estado=ENVIADO — bandeja del admin. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pedidos = await listarPedidos(searchParams.get('estado') ?? undefined);
    return NextResponse.json({ success: true, data: pedidos });
  } catch (error) {
    console.error('Error al listar pedidos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al conectar con la base de datos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders — checkout publico.
 *
 * Los precios se toman de la base, nunca del cuerpo de la peticion: si no,
 * cualquiera podria mandar un precio de $1 desde la consola del navegador.
 */
export async function POST(request: Request) {
  try {
    const entrada = leerEntradaPedido(await request.json());
    const pedido = await crearPedidoDb(entrada);
    return NextResponse.json({ success: true, data: pedido }, { status: 201 });
  } catch (error) {
    if (error instanceof ErrorPedido) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Error al crear el pedido:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo registrar el pedido' },
      { status: 500 }
    );
  }
}
