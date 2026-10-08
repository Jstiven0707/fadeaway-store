// ---------------------------------------------------------------------------
// CONSULTAS DE USUARIOS (solo servidor)
// ---------------------------------------------------------------------------

import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { db } from '@/lib/db';
import { randomBytes } from 'node:crypto';
import { filaAUsuario, hashPassword, verificarPassword } from '@/lib/auth';
import { Rol, Usuario, UsuarioInput } from '@/lib/usuarios';

const ROLES_VALIDOS: Rol[] = ['OWNER', 'ADMINISTRADOR', 'ASESOR'];

export class ErrorUsuario extends Error {}

export const leerEntradaUsuario = (body: unknown, exigirPassword: boolean): UsuarioInput => {
  const b = (body ?? {}) as Record<string, unknown>;

  const nombre = String(b.nombre ?? '').trim();
  if (!nombre) throw new ErrorUsuario('El nombre es obligatorio');
  if (nombre.length > 100) throw new ErrorUsuario('El nombre es demasiado largo');

  const usuario = String(b.usuario ?? '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) {
    throw new ErrorUsuario('El usuario debe tener 3 a 40 caracteres: letras, números, punto, guion o guion bajo');
  }

  const email = String(b.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErrorUsuario('El correo no es válido');
  if (email.length > 150) throw new ErrorUsuario('El correo es demasiado largo');

  const rol = String(b.rol ?? '') as Rol;
  if (!ROLES_VALIDOS.includes(rol)) throw new ErrorUsuario('Elige un perfil válido');

  const password = b.password === undefined ? undefined : String(b.password);
  if (exigirPassword || password !== undefined) {
    if (!password || password.length < 8) {
      throw new ErrorUsuario('La contraseña debe tener al menos 8 caracteres');
    }
  }

  return { nombre, usuario, email, rol, password, activo: b.activo === undefined ? true : b.activo === true };
};

export const listarUsuarios = async (): Promise<Usuario[]> => {
  const [filas] = await db.query<RowDataPacket[]>(
    `SELECT id, nombre, usuario, email, rol, activo, ultimo_acceso
       FROM usuarios WHERE estado_regis = 'ACTIVO' ORDER BY id`
  );
  return filas.map(filaAUsuario);
};

export const obtenerUsuario = async (id: number): Promise<Usuario | null> => {
  const [filas] = await db.query<RowDataPacket[]>(
    `SELECT id, nombre, usuario, email, rol, activo, ultimo_acceso
       FROM usuarios WHERE id = ? AND estado_regis = 'ACTIVO'`,
    [id]
  );
  return filas.length ? filaAUsuario(filas[0]) : null;
};

export const crearUsuarioDb = async (entrada: UsuarioInput): Promise<Usuario> => {
  const [existe] = await db.query<RowDataPacket[]>(
    `SELECT usuario, email FROM usuarios WHERE (email = ? OR usuario = ?) AND estado_regis = 'ACTIVO'`,
    [entrada.email, entrada.usuario]
  );
  if (existe.length > 0) {
    throw new ErrorUsuario(
      existe[0].usuario === entrada.usuario
        ? 'Ese nombre de usuario ya está ocupado'
        : 'Ya hay una cuenta con ese correo'
    );
  }

  const [res] = await db.query<ResultSetHeader>(
    `INSERT INTO usuarios (nombre, usuario, email, password, rol, activo, estado_regis, fecha_crecion, hora_de_crecion)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO', CURDATE(), CURTIME())`,
    [entrada.nombre, entrada.usuario, entrada.email, await hashPassword(entrada.password!), entrada.rol, entrada.activo !== false]
  );

  const creado = await obtenerUsuario(res.insertId);
  if (!creado) throw new Error('El usuario se creó pero no se pudo leer');
  return creado;
};

export const actualizarUsuarioDb = async (
  id: number,
  entrada: Partial<UsuarioInput>
): Promise<Usuario | null> => {
  const campos: string[] = [];
  const valores: (string | number | boolean)[] = [];

  if (entrada.nombre) { campos.push('nombre = ?'); valores.push(entrada.nombre); }
  if (entrada.usuario) {
    const [existe] = await db.query<RowDataPacket[]>(
      `SELECT id FROM usuarios WHERE usuario = ? AND id <> ? AND estado_regis = 'ACTIVO'`,
      [entrada.usuario, id]
    );
    if (existe.length > 0) throw new ErrorUsuario('Ese nombre de usuario ya está ocupado');
    campos.push('usuario = ?'); valores.push(entrada.usuario);
  }
  if (entrada.email) {
    const [existe] = await db.query<RowDataPacket[]>(
      `SELECT id FROM usuarios WHERE email = ? AND id <> ? AND estado_regis = 'ACTIVO'`,
      [entrada.email, id]
    );
    if (existe.length > 0) throw new ErrorUsuario('Ya hay otra cuenta con ese correo');
    campos.push('email = ?'); valores.push(entrada.email);
  }
  if (entrada.rol) { campos.push('rol = ?'); valores.push(entrada.rol); }
  if (entrada.activo !== undefined) { campos.push('activo = ?'); valores.push(entrada.activo); }
  if (entrada.password) { campos.push('password = ?'); valores.push(await hashPassword(entrada.password)); }

  if (campos.length === 0) return obtenerUsuario(id);

  const [res] = await db.query<ResultSetHeader>(
    `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ? AND estado_regis = 'ACTIVO'`,
    [...valores, id]
  );
  return res.affectedRows === 0 ? null : obtenerUsuario(id);
};

/** Baja logica. No se permite dejar la tienda sin ningun owner activo. */
export const eliminarUsuarioDb = async (id: number): Promise<boolean> => {
  const usuario = await obtenerUsuario(id);
  if (!usuario) return false;

  if (usuario.rol === 'OWNER') {
    const [owners] = await db.query<RowDataPacket[]>(
      `SELECT id FROM usuarios WHERE rol = 'OWNER' AND activo = 1 AND estado_regis = 'ACTIVO'`
    );
    if (owners.length <= 1) {
      throw new ErrorUsuario('No puedes eliminar al único owner: la tienda quedaría sin dueño');
    }
  }

  const [res] = await db.query<ResultSetHeader>(
    `UPDATE usuarios SET estado_regis = 'INACTIVO', activo = 0 WHERE id = ?`,
    [id]
  );
  return res.affectedRows > 0;
};

// ---------------------------------------------------------------------------
// RECUPERACIÓN DE CONTRASEÑA
//
// Las contraseñas no se pueden leer: lo guardado es un hash scrypt, que no
// se puede revertir. Recuperar significa poner una nueva, y para eso se usa
// un enlace de un solo uso que caduca.
// ---------------------------------------------------------------------------

const HORAS_VALIDEZ = 2;

/** Genera el enlace de restablecimiento y devuelve su token. */
export const generarTokenReset = async (id: number): Promise<string | null> => {
  const usuario = await obtenerUsuario(id);
  if (!usuario) return null;

  const token = randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + HORAS_VALIDEZ * 60 * 60 * 1000);

  await db.query(`UPDATE usuarios SET token_reset = ?, token_reset_expira = ? WHERE id = ?`, [
    token,
    expira,
    id,
  ]);
  return token;
};

/** Datos mínimos del dueño de un token, si sigue vigente. */
export const usuarioPorToken = async (token: string) => {
  const [filas] = await db.query<RowDataPacket[]>(
    `SELECT id, nombre, usuario FROM usuarios
      WHERE token_reset = ? AND token_reset_expira > NOW()
        AND activo = 1 AND estado_regis = 'ACTIVO'`,
    [token]
  );
  return filas.length ? { id: Number(filas[0].id), nombre: filas[0].nombre, usuario: filas[0].usuario } : null;
};

/** Cambia la contraseña y quema el token: cada enlace sirve una sola vez. */
export const cambiarPasswordConToken = async (token: string, password: string): Promise<boolean> => {
  if (!password || password.length < 8) {
    throw new ErrorUsuario('La contraseña debe tener al menos 8 caracteres');
  }

  const usuario = await usuarioPorToken(token);
  if (!usuario) return false;

  await db.query(
    `UPDATE usuarios SET password = ?, token_reset = NULL, token_reset_expira = NULL WHERE id = ?`,
    [await hashPassword(password), usuario.id]
  );
  return true;
};

/** Cambio de contraseña desde el panel, confirmando la actual. */
export const cambiarPasswordPropia = async (
  id: number,
  actual: string,
  nueva: string
): Promise<void> => {
  if (!nueva || nueva.length < 8) {
    throw new ErrorUsuario('La contraseña nueva debe tener al menos 8 caracteres');
  }

  const [filas] = await db.query<RowDataPacket[]>(
    `SELECT password FROM usuarios WHERE id = ? AND estado_regis = 'ACTIVO'`,
    [id]
  );
  if (filas.length === 0) throw new ErrorUsuario('Usuario no encontrado');

  if (!(await verificarPassword(actual, filas[0].password))) {
    throw new ErrorUsuario('La contraseña actual no es correcta');
  }

  await db.query(`UPDATE usuarios SET password = ? WHERE id = ?`, [await hashPassword(nueva), id]);
};
