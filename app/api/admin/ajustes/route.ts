import { NextResponse } from 'next/server';
import { guardarAjustesDb, leerAjustes } from '@/lib/pedidos-db';
import { ErrorAuth, exigir } from '@/lib/auth';

/**
 * Datos de pago de la tienda: numeros de Nequi y Daviplata, sus QR y el
 * WhatsApp de contacto. Viven en la tabla ajustes para poder cambiarlos
 * desde el panel sin tocar codigo ni reiniciar el servidor.
 */
export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await leerAjustes() });
  } catch (error) {
    console.error('Error al leer los ajustes:', error);
    return NextResponse.json({ success: false, error: 'Error en la base de datos' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await exigir('ajustes');
    const body = await request.json();
    const data = await guardarAjustesDb(body);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof ErrorAuth) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error al guardar los ajustes:', error);
    return NextResponse.json({ success: false, error: 'No se pudieron guardar' }, { status: 500 });
  }
}
