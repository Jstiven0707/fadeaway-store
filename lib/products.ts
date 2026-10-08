// ---------------------------------------------------------------------------
// TIPOS Y CLIENTE DE LA API DE PRODUCTOS
//
// Los productos viven en MySQL. Este archivo concentra el tipo que maneja el
// front y las funciones que hablan con /api/products, para que las paginas no
// repitan fetch ni armado de URLs.
// ---------------------------------------------------------------------------

export interface Presentacion {
  /** 50ml, 100ml, 200g, Unico... */
  nombre: string;
  stock: number;
}

export interface ProductSubcategory {
  name: string;
  href: string;
}

export interface Product {
  id: number;
  name: string;
  /** PERFUMERIA, MAQUILLAJE, CABELLO, SKINCARE, ACCESORIOS */
  category: string;
  subcategory: ProductSubcategory;
  price: number;
  description: string;
  presentations: Presentacion[];
  /** Suma del stock de todas las presentaciones */
  stock: number;
  image: string;
  status: 'Disponible' | 'Agotado';
  isNewRelease: boolean;
}

/** Lo que se envia al crear o editar un producto. */
export interface ProductInput {
  subcategoryHref: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isNewRelease: boolean;
  presentations: Presentacion[];
}

export interface ProductFilters {
  /** Ruta completa de la subcategoria: /skincare/cremas */
  href?: string;
  /** Slug de la categoria: skincare */
  categoria?: string;
  /** Solo los marcados como nuevo lanzamiento */
  lanzamientos?: boolean;
  /** Busqueda por nombre, descripcion o subcategoria */
  q?: string;
  limit?: number;
}

const construirQuery = (filtros: ProductFilters) => {
  const p = new URLSearchParams();
  if (filtros.href) p.set('href', filtros.href);
  if (filtros.categoria) p.set('categoria', filtros.categoria);
  if (filtros.lanzamientos) p.set('lanzamientos', '1');
  if (filtros.q) p.set('q', filtros.q);
  if (filtros.limit) p.set('limit', String(filtros.limit));
  const s = p.toString();
  return s ? `?${s}` : '';
};

/** Lee productos de la base. Lanza si la API responde con error. */
export async function fetchProducts(filtros: ProductFilters = {}): Promise<Product[]> {
  const res = await fetch(`/api/products${construirQuery(filtros)}`, { cache: 'no-store' });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'No se pudieron cargar los productos');
  }
  return json.data as Product[];
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'No se pudo crear el producto');
  }
  return json.data as Product;
}

export async function updateProduct(id: number, input: ProductInput): Promise<Product> {
  const res = await fetch(`/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'No se pudo actualizar el producto');
  }
  return json.data as Product;
}

/** Baja logica: el producto queda INACTIVO, no se borra la fila. */
export async function deleteProduct(id: number): Promise<void> {
  const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'No se pudo eliminar el producto');
  }
}

/** Sube una foto y devuelve su ruta publica (/uploads/xxx.webp). */
export async function uploadProductImage(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch('/api/admin/upload', { method: 'POST', body });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'No se pudo subir la imagen');
  }
  return json.url as string;
}

export const formatCOP = (amount: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
