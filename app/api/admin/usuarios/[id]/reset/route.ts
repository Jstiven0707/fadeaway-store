import { NextResponse } from 'next/server';
import { ErrorAuth, exigir } from '@/lib/auth';
import { generarTokenReset } from '@/lib/usuarios-db';

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/usuarios/[id]/reset
 *
 * El owner genera un enlace de un solo uso para que esa persona ponga una
 * contraseña nueva. Devuelve el token; el panel arma la URL y la manda por
 * WhatsApp. No se envia correo porque la tienda todavia no tiene un
 * servicio de envio configurado.
 */
export async function POST(_request: Request, ctx: Contexto) {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    return NextResponse.json({ success: false, error: 'Id inválido' }, { status: 400 });
  }

  try {
    await exigir('usuarios');
    const token = await generarTokenReset(n);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { token, horas: 2 } });
  } catch (error) {
    if (error instanceof ErrorAuth) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error generando el enlace:', error);
    return NextResponse.json({ success: false, error: 'No se pudo generar el enlace' }, { status: 500 });
  }
}
