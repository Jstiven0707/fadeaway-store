// ---------------------------------------------------------------------------
// CONSULTAS DE USUARIOS (solo servidor)
// ---------------------------------------------------------------------------

import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { db } from '@/lib/db';
import { filaAUsuario, hashPassword } from '@/lib/auth';
import { Rol, Usuario, UsuarioInput } from '@/lib/usuarios';

const ROLES_VALIDOS: Rol[] = ['OWNER', 'ADMINISTRADOR', 'ASESOR'];

export class ErrorUsuario extends Error {}

export const leerEntradaUsuario = (body: unknown, exigirPassword: boolean): UsuarioInput => {
  const b = (body ?? {}) as Record<string, unknown>;

  const nombre = String(b.nombre ?? '').trim();
  if (!nombre) throw new ErrorUsuario('El nombre es obligatorio');
  if (nombre.length > 100) throw new ErrorUsuario('El nombre es demasiado largo');

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

  return { nombre, email, rol, password, activo: b.activo === undefined ? true : b.activo === true };
};

export const listarUsuarios = async (): Promise<Usuario[]> => {
  const [filas] = await db.query<RowDataPacket[]>(
    `SELECT id, nombre, email, rol, activo, ultimo_acceso
       FROM usuarios WHERE estado_regis = 'ACTIVO' ORDER BY id`
  );
  return filas.map(filaAUsuario);
};

export const obtenerUsuario = async (id: number): Promise<Usuario | null> => {
  const [filas] = await db.query<RowDataPacket[]>(
    `SELECT id, nombre, email, rol, activo, ultimo_acceso
       FROM usuarios WHERE id = ? AND estado_regis = 'ACTIVO'`,
    [id]
  );
  return filas.length ? filaAUsuario(filas[0]) : null;
};

export const crearUsuarioDb = async (entrada: UsuarioInput): Promise<Usuario> => {
  const [existe] = await db.query<RowDataPacket[]>(
    `SELECT id FROM usuarios WHERE email = ? AND estado_regis = 'ACTIVO'`,
    [entrada.email]
  );
  if (existe.length > 0) throw new ErrorUsuario('Ya hay un usuario con ese correo');

  const [res] = await db.query<ResultSetHeader>(
    `INSERT INTO usuarios (nombre, email, password, rol, activo, estado_regis, fecha_crecion, hora_de_crecion)
     VALUES (?, ?, ?, ?, ?, 'ACTIVO', CURDATE(), CURTIME())`,
    [entrada.nombre, entrada.email, await hashPassword(entrada.password!), entrada.rol, entrada.activo !== false]
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
  if (entrada.email) {
    const [existe] = await db.query<RowDataPacket[]>(
      `SELECT id FROM usuarios WHERE email = ? AND id <> ? AND estado_regis = 'ACTIVO'`,
      [entrada.email, id]
    );
    if (existe.length > 0) throw new ErrorUsuario('Ya hay otro usuario con ese correo');
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
