import { NextResponse } from 'next/server';
import { exigir, ErrorAuth } from '@/lib/auth';
import {
  ErrorUsuario,
  cambiarPasswordConToken,
  cambiarPasswordPropia,
  usuarioPorToken,
} from '@/lib/usuarios-db';

const ENLACE_INVALIDO = 'Este enlace ya no sirve. Pídele uno nuevo al dueño de la tienda.';

/** GET /api/clave?token=... — comprueba el enlace antes de mostrar el formulario. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') ?? '';

  try {
    const usuario = token ? await usuarioPorToken(token) : null;
    if (!usuario) {
      return NextResponse.json({ success: false, error: ENLACE_INVALIDO }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: usuario });
  } catch (error) {
    console.error('Error validando el enlace:', error);
    return NextResponse.json({ success: false, error: 'Error en la base de datos' }, { status: 500 });
  }
}

/**
 * POST /api/clave — pone una contraseña nueva.
 *
 * Dos caminos:
 *   - con token: el enlace de recuperacion, que se quema al usarlo
 *   - con sesion: cambiar la propia, confirmando la actual
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      password?: string;
      actual?: string;
    };

    if (body.token) {
      const ok = await cambiarPasswordConToken(body.token, body.password ?? '');
      if (!ok) {
        return NextResponse.json({ success: false, error: ENLACE_INVALIDO }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: null });
    }

    const yo = await exigir();
    await cambiarPasswordPropia(yo.id, body.actual ?? '', body.password ?? '');
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    if (error instanceof ErrorAuth) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    if (error instanceof ErrorUsuario) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Error al cambiar la contraseña:', error);
    return NextResponse.json({ success: false, error: 'No se pudo cambiar la contraseña' }, { status: 500 });
  }
}
