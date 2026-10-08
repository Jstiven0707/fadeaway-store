// ---------------------------------------------------------------------------
// SESIONES Y CONTRASEÑAS (solo servidor)
//
// Sin dependencias nuevas: scrypt y HMAC vienen en Node.
//   - La contraseña se guarda como hash scrypt con sal propia, nunca en texto.
//   - La sesion es una cookie HttpOnly firmada con HMAC, asi que el navegador
//     no puede fabricarse un rol: cualquier cambio invalida la firma.
// ---------------------------------------------------------------------------

import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import type { RowDataPacket } from 'mysql2/promise';
import { db } from '@/lib/db';
import { Permiso, Rol, Usuario, puede } from '@/lib/usuarios';

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const COOKIE = 'op_sesion';
const DURACION_HORAS = 12;

const secreto = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('Falta AUTH_SECRET en .env');
  return s;
};

// --- CONTRASEÑAS ---

export const hashPassword = async (password: string): Promise<string> => {
  const sal = randomBytes(16);
  const derivada = await scrypt(password, sal, 64);
  return `${sal.toString('hex')}:${derivada.toString('hex')}`;
};

export const verificarPassword = async (password: string, guardado: string): Promise<boolean> => {
  const [salHex, derivadaHex] = guardado.split(':');
  if (!salHex || !derivadaHex) return false;
  const esperada = Buffer.from(derivadaHex, 'hex');
  const calculada = await scrypt(password, Buffer.from(salHex, 'hex'), esperada.length);
  // timingSafeEqual evita filtrar informacion por el tiempo de comparacion
  return esperada.length === calculada.length && timingSafeEqual(esperada, calculada);
};

// --- COOKIE FIRMADA ---

interface Carga {
  id: number;
  rol: Rol;
  exp: number;
}

const firmar = (datos: string) => createHmac('sha256', secreto()).update(datos).digest('base64url');

const crearToken = (carga: Carga) => {
  const datos = Buffer.from(JSON.stringify(carga)).toString('base64url');
  return `${datos}.${firmar(datos)}`;
};

const leerToken = (token: string | undefined): Carga | null => {
  if (!token) return null;
  const [datos, firma] = token.split('.');
  if (!datos || !firma) return null;

  const esperada = Buffer.from(firmar(datos));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;

  try {
    const carga = JSON.parse(Buffer.from(datos, 'base64url').toString()) as Carga;
    return carga.exp > Date.now() ? carga : null;
  } catch {
    return null;
  }
};

export const abrirSesion = async (usuario: Usuario) => {
  const tienda = await cookies();
  tienda.set(COOKIE, crearToken({
    id: usuario.id,
    rol: usuario.rol,
    exp: Date.now() + DURACION_HORAS * 60 * 60 * 1000,
  }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DURACION_HORAS * 60 * 60,
  });
};

export const cerrarSesionCookie = async () => {
  const tienda = await cookies();
  tienda.delete(COOKIE);
};

// --- USUARIO ACTUAL ---

export const filaAUsuario = (r: RowDataPacket): Usuario => ({
  id: Number(r.id),
  nombre: r.nombre,
  email: r.email,
  rol: r.rol as Rol,
  activo: Boolean(r.activo),
  ultimoAcceso: r.ultimo_acceso ? new Date(r.ultimo_acceso).toISOString() : null,
});

/**
 * Devuelve el usuario de la sesion, releyendolo de la base.
 * Asi un cambio de rol o una desactivacion surten efecto de inmediato, sin
 * esperar a que expire la cookie.
 */
export const sesionActual = async (): Promise<Usuario | null> => {
  const tienda = await cookies();
  const carga = leerToken(tienda.get(COOKIE)?.value);
  if (!carga) return null;

  const [filas] = await db.query<RowDataPacket[]>(
    `SELECT id, nombre, email, rol, activo, ultimo_acceso
       FROM usuarios WHERE id = ? AND activo = 1 AND estado_regis = 'ACTIVO'`,
    [carga.id]
  );
  return filas.length ? filaAUsuario(filas[0]) : null;
};

export const hayUsuarios = async (): Promise<boolean> => {
  const [filas] = await db.query<RowDataPacket[]>(
    `SELECT 1 FROM usuarios WHERE estado_regis = 'ACTIVO' LIMIT 1`
  );
  return filas.length > 0;
};

/** Error que las rutas traducen a 401 o 403. */
export class ErrorAuth extends Error {
  constructor(message: string, public status: 401 | 403) {
    super(message);
  }
}

/**
 * Exige sesion y, si se indica, un permiso concreto.
 * Esta es la unica puerta: no alcanza con esconder el boton en la interfaz.
 */
export const exigir = async (permiso?: Permiso): Promise<Usuario> => {
  const usuario = await sesionActual();
  if (!usuario) throw new ErrorAuth('Inicia sesión para continuar', 401);
  if (permiso && !puede(usuario.rol, permiso)) {
    throw new ErrorAuth('Tu perfil no tiene permiso para esta acción', 403);
  }
  return usuario;
};
