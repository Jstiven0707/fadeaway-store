import { NextResponse } from 'next/server';
import { ErrorAuth, exigir } from '@/lib/auth';
import { ErrorUsuario, actualizarUsuarioDb, eliminarUsuarioDb, leerEntradaUsuario } from '@/lib/usuarios-db';

type Contexto = { params: Promise<{ id: string }> };

const leerId = async (ctx: Contexto) => {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const manejar = (error: unknown) => {
  if (error instanceof ErrorAuth) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  if (error instanceof ErrorUsuario) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
  console.error('Error en usuarios:', error);
  return NextResponse.json({ success: false, error: 'Error en la base de datos' }, { status: 500 });
};

/** PUT /api/admin/usuarios/[id] — la contraseña solo cambia si viene en el cuerpo. */
export async function PUT(request: Request, ctx: Contexto) {
  const id = await leerId(ctx);
  if (!id) return NextResponse.json({ success: false, error: 'Id inválido' }, { status: 400 });

  try {
    const yo = await exigir('usuarios');
    const entrada = leerEntradaUsuario(await request.json(), false);

    // Nadie puede quitarse a si mismo el perfil de owner y quedar encerrado
    if (yo.id === id && entrada.rol !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'No puedes cambiarte tu propio perfil de owner' },
        { status: 400 }
      );
    }

    const usuario = await actualizarUsuarioDb(id, entrada);
    if (!usuario) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: usuario });
  } catch (error) {
    return manejar(error);
  }
}

/** DELETE /api/admin/usuarios/[id] — baja lógica. */
export async function DELETE(_request: Request, ctx: Contexto) {
  const id = await leerId(ctx);
  if (!id) return NextResponse.json({ success: false, error: 'Id inválido' }, { status: 400 });

  try {
    const yo = await exigir('usuarios');
    if (yo.id === id) {
      return NextResponse.json(
        { success: false, error: 'No puedes eliminar tu propia cuenta' },
        { status: 400 }
      );
    }

    const ok = await eliminarUsuarioDb(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return manejar(error);
  }
}
