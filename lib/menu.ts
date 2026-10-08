// ---------------------------------------------------------------------------
// ESTRUCTURA OFICIAL DEL CATÁLOGO OCEANPARK — PERFUMES / COSMÉTICOS / ACCESORIOS
//
// Este archivo es la ÚNICA fuente de verdad del menú. La home, el catálogo y el
// panel de admin lo importan desde aquí, así no se vuelve a desincronizar.
//
// Reglas para los href:
//   - Siempre en minúsculas, sin espacios ni "&".
//   - Formato: /<categoria>/<subcategoria>
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ALMACENAMIENTO LOCAL
// Las claves pasaron de "fadeaway_*" a "oceanpark_*" con el cambio de marca.
// readStorage() migra lo que ya estuviera guardado con el nombre anterior,
// así nadie pierde su catálogo, carrito ni pedidos.
// ---------------------------------------------------------------------------

export const STORAGE_KEYS = {
  products: 'oceanpark_products',
  cart: 'oceanpark_cart',
  orders: 'oceanpark_orders',
} as const;

const LEGACY_STORAGE_KEYS: Record<string, string> = {
  [STORAGE_KEYS.products]: 'fadeaway_products',
  [STORAGE_KEYS.cart]: 'fadeaway_cart',
  [STORAGE_KEYS.orders]: 'fadeaway_orders',
};

export const readStorage = (key: string): string | null => {
  try {
    const current = localStorage.getItem(key);
    if (current !== null) return current;

    const legacyKey = LEGACY_STORAGE_KEYS[key];
    if (!legacyKey) return null;

    const legacy = localStorage.getItem(legacyKey);
    if (legacy !== null) {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(legacyKey);
    }
    return legacy;
  } catch (e) {
    console.error('No se pudo leer el almacenamiento local:', e);
    return null;
  }
};

export interface SubcategoryOption {
  label: string;
  href: string;
}

export interface CategoryGroup {
  title: string;
  subcategories: SubcategoryOption[];
}

export interface ProductSubcategory {
  name: string;
  href?: string;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string; // PERFUMERIA, MAQUILLAJE, CABELLO, SKINCARE, ACCESORIOS
  subcategory?: ProductSubcategory;
  price: number;
  description: string;
  /** Presentaciones de venta: 50ml, 100ml, 200g, Único... (antes eran "tallas") */
  presentations: string[];
  image: string;
  stock: number;
  status: 'Disponible' | 'Agotado';
  isNewRelease?: boolean; // Control manual para Nuevos Lanzamientos
}

export const menuData: Record<string, CategoryGroup[]> = {
  PERFUMERIA: [
    {
      title: 'Explorar por Género',
      subcategories: [
        { label: 'Para Ella', href: '/perfumeria/mujer' },
        { label: 'Para Él', href: '/perfumeria/hombre' },
        { label: 'Unisex / The Collection', href: '/perfumeria/unisex' },
      ],
    },
    {
      title: 'Familias Olfativas',
      subcategories: [
        { label: 'Florales & Dulces', href: '/perfumeria/dulces-especiados' },
        { label: 'Frescos & Cítricos', href: '/perfumeria/frescos' },
        { label: 'Amaderados & Orientales', href: '/perfumeria/amaderados' },
      ],
    },
    {
      title: 'Destacados',
      subcategories: [
        { label: 'Más Vendidos', href: '/perfumeria/best-sellers' },
        { label: 'Decants & Travel Size', href: '/perfumeria/viajeros' },
        { label: 'Ediciones Limitadas', href: '/perfumeria/edicion-limitada' },
        { label: 'Nuevos Lanzamientos', href: '/perfumeria/lanzamientos' },
      ],
    },
  ],
  MAQUILLAJE: [
    {
      title: 'Rostro',
      subcategories: [
        { label: 'Bases & BB Cream', href: '/maquillaje/bases' },
        { label: 'Polvos & Correctores', href: '/maquillaje/polvos' },
        { label: 'Rubor & Iluminador', href: '/maquillaje/rubor' },
      ],
    },
    {
      title: 'Ojos & Labios',
      subcategories: [
        { label: 'Sombras & Paletas', href: '/maquillaje/sombras' },
        { label: 'Máscaras & Delineadores', href: '/maquillaje/ojos' },
        { label: 'Labiales & Brillos', href: '/maquillaje/labios' },
      ],
    },
    {
      title: 'Destacados',
      subcategories: [
        { label: 'Más Vendidos', href: '/maquillaje/best-sellers' },
        { label: 'Nuevos Lanzamientos', href: '/maquillaje/lanzamientos' },
      ],
    },
  ],
  CABELLO: [
    {
      title: 'Cuidado Diario',
      subcategories: [
        { label: 'Shampoo & Acondicionador', href: '/cabello/shampoo' },
        { label: 'Mascarillas Capilares', href: '/cabello/mascarillas' },
        { label: 'Tratamientos & Ampollas', href: '/cabello/tratamientos' },
      ],
    },
    {
      title: 'Estilo & Color',
      subcategories: [
        { label: 'Tintes & Decolorantes', href: '/cabello/tintes' },
        { label: 'Styling & Protector Térmico', href: '/cabello/styling' },
        { label: 'Planchas & Secadores', href: '/cabello/herramientas' },
      ],
    },
    {
      title: 'Destacados',
      subcategories: [
        { label: 'Más Vendidos', href: '/cabello/best-sellers' },
        { label: 'Nuevos Lanzamientos', href: '/cabello/lanzamientos' },
      ],
    },
  ],
  SKINCARE: [
    {
      title: 'Rutina Facial',
      subcategories: [
        { label: 'Limpiadores & Tónicos', href: '/skincare/limpiadores' },
        { label: 'Serums & Esencias', href: '/skincare/serums' },
        { label: 'Cremas Hidratantes', href: '/skincare/cremas' },
      ],
    },
    {
      title: 'Tratamientos',
      subcategories: [
        { label: 'Mascarillas Faciales', href: '/skincare/mascarillas' },
        { label: 'Contorno de Ojos', href: '/skincare/contorno' },
        { label: 'Protector Solar', href: '/skincare/protector-solar' },
      ],
    },
    {
      title: 'Cuerpo & Destacados',
      subcategories: [
        { label: 'Cremas Corporales', href: '/skincare/corporal' },
        { label: 'Exfoliantes', href: '/skincare/exfoliantes' },
        { label: 'Nuevos Lanzamientos', href: '/skincare/lanzamientos' },
      ],
    },
  ],
  ACCESORIOS: [
    {
      title: 'Herramientas de Belleza',
      subcategories: [
        { label: 'Brochas & Esponjas', href: '/accesorios/brochas' },
        { label: 'Organizadores & Cosmetiqueras', href: '/accesorios/organizadores' },
        { label: 'Espejos & Kits', href: '/accesorios/espejos' },
      ],
    },
    {
      title: 'Cabello & Regalo',
      subcategories: [
        { label: 'Accesorios para Cabello', href: '/accesorios/cabello' },
        { label: 'Sets de Regalo', href: '/accesorios/sets' },
        { label: 'Nuevos Lanzamientos', href: '/accesorios/lanzamientos' },
      ],
    },
  ],
};

export const CATEGORIES_PRINCIPALES = Object.keys(menuData);

/** Nombre bonito (con tilde) para mostrar; la clave interna va sin tildes. */
export const CATEGORY_LABELS: Record<string, string> = {
  PERFUMERIA: 'PERFUMERÍA',
  MAQUILLAJE: 'MAQUILLAJE',
  CABELLO: 'CABELLO',
  SKINCARE: 'SKINCARE',
  ACCESORIOS: 'ACCESORIOS',
};

export const categoryLabel = (key: string) => CATEGORY_LABELS[key] ?? key;

/** Presentación sugerida al crear un producto nuevo, según la categoría. */
export const DEFAULT_PRESENTATIONS: Record<string, string> = {
  PERFUMERIA: '30ml, 50ml, 100ml',
  MAQUILLAJE: 'Único',
  CABELLO: '300ml, 500ml',
  SKINCARE: '50ml, 100ml',
  ACCESORIOS: 'Único',
};

export const getDefaultPresentations = (category: string) =>
  DEFAULT_PRESENTATIONS[category] ?? 'Único';

export const isLaunchHref = (href?: string) =>
  !!href && href.toLowerCase().endsWith('/lanzamientos');

/**
 * Subcategorías elegibles en el formulario del admin.
 * Se excluye "Nuevos Lanzamientos": eso lo controla el checkbox isNewRelease.
 */
export const getSubcategoriesForCategory = (catKey: string): SubcategoryOption[] =>
  (menuData[catKey] || [])
    .flatMap((group) => group.subcategories)
    .filter((sub) => !isLaunchHref(sub.href));

/** Todos los href válidos del menú actual, para validar datos guardados. */
const VALID_HREFS = new Set(
  Object.values(menuData)
    .flat()
    .flatMap((group) => group.subcategories)
    .map((sub) => sub.href)
);

/** Busca el label oficial de un href (o undefined si ya no existe en el menú). */
export const findSubcategoryByHref = (href?: string): SubcategoryOption | undefined => {
  if (!href) return undefined;
  return Object.values(menuData)
    .flat()
    .flatMap((group) => group.subcategories)
    .find((sub) => sub.href === href.toLowerCase());
};

/** Categoría a la que pertenece un href (/skincare/cremas -> SKINCARE). */
export const findCategoryByHref = (href?: string): string | undefined => {
  if (!href) return undefined;
  return CATEGORIES_PRINCIPALES.find((cat) =>
    menuData[cat].some((group) =>
      group.subcategories.some((sub) => sub.href === href.toLowerCase())
    )
  );
};

/** Href antiguos que sí tienen equivalente directo en el menú nuevo. */
const LEGACY_HREF_MAP: Record<string, string> = {
  '/perfumeria/Supreme': '/perfumeria/best-sellers',
  '/perfumeria/decants': '/perfumeria/viajeros',
  '/perfumeria/florales': '/perfumeria/dulces-especiados',
};

/**
 * Normaliza un producto guardado en localStorage antes de usarlo.
 *
 * Migra datos de la etapa de ropa:
 *   - "sizes" (tallas S/M/L) pasa a "presentations" (ml/g).
 *   - Categorías que ya no existen (HOMBRE, MUJER, KIDS) caen a PERFUMERIA.
 *   - Subcategorías huérfanas se borran para que las vuelvas a elegir al editar.
 *   - "Nuevos Lanzamientos" como subcategoría pasa al checkbox isNewRelease.
 */
export const normalizeProduct = (raw: Product & { sizes?: string[] }): Product => {
  let next: Product = { ...raw };

  // Tallas viejas -> presentaciones
  if (!Array.isArray(next.presentations)) {
    next.presentations = Array.isArray(raw.sizes) && raw.sizes.length ? raw.sizes : ['Único'];
  }
  delete (next as Product & { sizes?: string[] }).sizes;

  // Href viejos con mayúsculas/espacios o renombrados
  if (next.subcategory?.href) {
    const lowered = next.subcategory.href.toLowerCase();
    const fixed = LEGACY_HREF_MAP[next.subcategory.href] ?? LEGACY_HREF_MAP[lowered] ?? lowered;
    next = { ...next, subcategory: { ...next.subcategory, href: fixed } };
  }

  // "Nuevos Lanzamientos" era una subcategoría; ahora es un checkbox
  if (isLaunchHref(next.subcategory?.href)) {
    next = { ...next, isNewRelease: true, subcategory: undefined };
  }

  // Subcategoría que ya no existe en el menú de belleza: se limpia
  if (next.subcategory?.href && !VALID_HREFS.has(next.subcategory.href)) {
    next = { ...next, subcategory: undefined };
  }

  // Categoría de la etapa de ropa: se reubica y se pide volver a clasificar
  if (!next.category || !menuData[next.category]) {
    next = { ...next, category: 'PERFUMERIA', subcategory: undefined };
  }

  if (typeof next.isNewRelease !== 'boolean') {
    next = { ...next, isNewRelease: false };
  }

  return next;
};
