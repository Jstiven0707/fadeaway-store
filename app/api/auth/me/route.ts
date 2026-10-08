import { NextResponse } from 'next/server';
import { hayUsuarios, sesionActual } from '@/lib/auth';

/**
 * GET /api/auth/me
 *
 * El panel llama a esta ruta al cargar. Devuelve quien esta en sesion, o
 * avisa que la tienda todavia no tiene ningun usuario para que se cree el
 * primero. Asi recargar la pagina ya no saca a nadie.
 */
export async function GET() {
  try {
    const usuario = await sesionActual();
    return NextResponse.json({
      success: true,
      data: { usuario, necesitaSetup: usuario ? false : !(await hayUsuarios()) },
    });
  } catch (error) {
    console.error('Error al leer la sesión:', error);
    return NextResponse.json({ success: false, error: 'Error en la base de datos' }, { status: 500 });
  }
}
