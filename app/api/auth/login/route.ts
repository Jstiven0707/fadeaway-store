import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { db } from '@/lib/db';
import { abrirSesion, filaAUsuario, verificarPassword } from '@/lib/auth';

/** Mismo mensaje para email inexistente y clave mala: no revela qué correos existen. */
const CREDENCIALES = 'Correo o contraseña incorrectos';

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string };
    if (!email || !password) {
      return NextResponse.json({ success: false, error: CREDENCIALES }, { status: 401 });
    }

    const [filas] = await db.query<RowDataPacket[]>(
      `SELECT id, nombre, email, rol, activo, ultimo_acceso, password
         FROM usuarios WHERE email = ? AND estado_regis = 'ACTIVO'`,
      [email.trim().toLowerCase()]
    );

    const fila = filas[0];
    const valida = fila ? await verificarPassword(password, fila.password) : false;

    if (!fila || !valida || !fila.activo) {
      // Pequeña espera para que probar claves a lo bruto salga caro
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ success: false, error: CREDENCIALES }, { status: 401 });
    }

    await db.query(`UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?`, [fila.id]);

    const usuario = filaAUsuario(fila);
    await abrirSesion(usuario);
    return NextResponse.json({ success: true, data: usuario });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return NextResponse.json({ success: false, error: 'No se pudo iniciar sesión' }, { status: 500 });
  }
}
