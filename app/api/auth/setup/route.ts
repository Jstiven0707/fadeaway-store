import { NextResponse } from 'next/server';
import { abrirSesion, hayUsuarios } from '@/lib/auth';
import { ErrorUsuario, crearUsuarioDb, leerEntradaUsuario } from '@/lib/usuarios-db';

/**
 * POST /api/auth/setup — crea el primer usuario de la tienda.
 *
 * Solo funciona mientras no exista ningun usuario. Es la forma de arrancar
 * sin dejar una contraseña escrita en el codigo: el primero que entre crea
 * la cuenta del dueño y queda con sesion iniciada.
 */
export async function POST(request: Request) {
  try {
    if (await hayUsuarios()) {
      return NextResponse.json(
        { success: false, error: 'La tienda ya tiene usuarios. Inicia sesión.' },
        { status: 409 }
      );
    }

    const entrada = leerEntradaUsuario(await request.json(), true);
    // El primero siempre es owner, sin importar lo que venga en el cuerpo
    const usuario = await crearUsuarioDb({ ...entrada, rol: 'OWNER' });

    await abrirSesion(usuario);
    return NextResponse.json({ success: true, data: usuario }, { status: 201 });
  } catch (error) {
    if (error instanceof ErrorUsuario) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Error en el setup inicial:', error);
    return NextResponse.json({ success: false, error: 'No se pudo crear la cuenta' }, { status: 500 });
  }
}
