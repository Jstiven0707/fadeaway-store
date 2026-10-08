// ---------------------------------------------------------------------------
// USUARIOS, ROLES Y PERMISOS
//
// Este archivo lo usan el servidor y el navegador, asi que no puede importar
// nada de Node. La verificacion real vive en lib/auth.ts y en cada ruta de
// API; lo de aqui sirve para que la interfaz no muestre lo que no se puede.
// ---------------------------------------------------------------------------

export type Rol = 'OWNER' | 'ADMINISTRADOR' | 'ASESOR';

export const ROLES: Record<Rol, { label: string; descripcion: string }> = {
  OWNER: {
    label: 'Owner',
    descripcion: 'Dueño de la tienda. Puede todo, incluido eliminar pedidos y crear usuarios.',
  },
  ADMINISTRADOR: {
    label: 'Administrador',
    descripcion: 'Opera la tienda completa: catálogo, pedidos, ventas y datos de pago.',
  },
  ASESOR: {
    label: 'Asesor',
    descripcion: 'Atiende pedidos: ve la bandeja, cambia estados y registra ventas por chat.',
  },
};

export type Permiso =
  | 'pedidos'
  | 'catalogo'
  | 'ventas'
  | 'ajustes'
  | 'usuarios'
  | 'eliminarPedidos';

const PERMISOS: Record<Rol, Permiso[]> = {
  OWNER: ['pedidos', 'catalogo', 'ventas', 'ajustes', 'usuarios', 'eliminarPedidos'],
  ADMINISTRADOR: ['pedidos', 'catalogo', 'ventas', 'ajustes'],
  ASESOR: ['pedidos'],
};

export const puede = (rol: Rol | undefined, permiso: Permiso): boolean =>
  !!rol && PERMISOS[rol].includes(permiso);

export interface Usuario {
  id: number;
  nombre: string;
  /** Con esto se inicia sesión */
  usuario: string;
  email: string;
  rol: Rol;
  activo: boolean;
  ultimoAcceso: string | null;
}

export interface UsuarioInput {
  nombre: string;
  usuario: string;
  email: string;
  password?: string;
  rol: Rol;
  activo?: boolean;
}

// --- CLIENTE DE LA API ---

const pedir = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { cache: 'no-store', ...init });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'La operación no se pudo completar');
  return json.data as T;
};

const conCuerpo = (metodo: string, cuerpo: unknown): RequestInit => ({
  method: metodo,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
});

/** Estado de la sesión: quién soy, o si hay que crear el primer dueño. */
export interface EstadoSesion {
  usuario: Usuario | null;
  /** true cuando la tienda no tiene ningún usuario todavía */
  necesitaSetup: boolean;
}

export const fetchSesion = () => pedir<EstadoSesion>('/api/auth/me');

/** Acepta nombre de usuario o correo en el mismo campo. */
export const iniciarSesion = (identificador: string, password: string) =>
  pedir<Usuario>('/api/auth/login', conCuerpo('POST', { identificador, password }));

export const cerrarSesion = () => pedir<null>('/api/auth/logout', { method: 'POST' });

/** Crea el primer usuario (owner). Solo funciona si no hay ninguno. */
export const crearPrimerUsuario = (input: UsuarioInput) =>
  pedir<Usuario>('/api/auth/setup', conCuerpo('POST', input));

export const fetchUsuarios = () => pedir<Usuario[]>('/api/admin/usuarios');

export const crearUsuario = (input: UsuarioInput) =>
  pedir<Usuario>('/api/admin/usuarios', conCuerpo('POST', input));

export const actualizarUsuario = (id: number, input: Partial<UsuarioInput>) =>
  pedir<Usuario>(`/api/admin/usuarios/${id}`, conCuerpo('PUT', input));

export const eliminarUsuario = (id: number) =>
  pedir<null>(`/api/admin/usuarios/${id}`, { method: 'DELETE' });

/** El owner genera un enlace para que alguien ponga una contraseña nueva. */
export const generarEnlaceClave = (id: number) =>
  pedir<{ token: string; horas: number }>(`/api/admin/usuarios/${id}/reset`, { method: 'POST' });

/** Cambio de la propia contraseña, confirmando la actual. */
export const cambiarMiPassword = (actual: string, password: string) =>
  pedir<null>('/api/clave', conCuerpo('POST', { actual, password }));
