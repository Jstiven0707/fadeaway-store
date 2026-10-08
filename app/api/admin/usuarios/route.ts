import { NextResponse } from 'next/server';
import { ErrorAuth, exigir } from '@/lib/auth';
import { ErrorUsuario, crearUsuarioDb, leerEntradaUsuario, listarUsuarios } from '@/lib/usuarios-db';

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

/** GET /api/admin/usuarios — solo el owner gestiona usuarios. */
export async function GET() {
  try {
    await exigir('usuarios');
    return NextResponse.json({ success: true, data: await listarUsuarios() });
  } catch (error) {
    return manejar(error);
  }
}

/** POST /api/admin/usuarios */
export async function POST(request: Request) {
  try {
    await exigir('usuarios');
    const entrada = leerEntradaUsuario(await request.json(), true);
    return NextResponse.json({ success: true, data: await crearUsuarioDb(entrada) }, { status: 201 });
  } catch (error) {
    return manejar(error);
  }
}
