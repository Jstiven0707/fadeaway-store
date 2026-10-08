'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { Product, STORAGE_KEYS, categoryLabel, normalizeProduct, readStorage } from '@/lib/menu';

// Catálogo de ejemplo: se usa solo mientras no haya productos creados en el admin.
const fallbackProducts: Product[] = [
  {
    id: 'DEMO-1',
    name: 'Eau de Parfum Oceanpark Night',
    category: 'PERFUMERIA',
    subcategory: { name: 'Para Ella', href: '/perfumeria/mujer' },
    price: 120000,
    description: 'Fragancia floral amaderada de alta fijación.',
    presentations: ['50ml', '100ml'],
    image: '',
    stock: 10,
    status: 'Disponible',
  },
  {
    id: 'DEMO-2',
    name: 'Paleta de Sombras Nude Edition',
    category: 'MAQUILLAJE',
    subcategory: { name: 'Sombras & Paletas', href: '/maquillaje/sombras' },
    price: 75000,
    description: '12 tonos mate y satinados de alta pigmentación.',
    presentations: ['Único'],
    image: '',
    stock: 8,
    status: 'Disponible',
  },
  {
    id: 'DEMO-3',
    name: 'Mascarilla Capilar Reparación Intensa',
    category: 'CABELLO',
    subcategory: { name: 'Mascarillas Capilares', href: '/cabello/mascarillas' },
    price: 62000,
    description: 'Tratamiento con keratina para cabello procesado.',
    presentations: ['300ml'],
    image: '',
    stock: 12,
    status: 'Disponible',
  },
  {
    id: 'DEMO-4',
    name: 'Crema Hidratante Facial Ácido Hialurónico',
    category: 'SKINCARE',
    subcategory: { name: 'Cremas Hidratantes', href: '/skincare/cremas' },
    price: 88000,
    description: 'Hidratación profunda 24h para todo tipo de piel.',
    presentations: ['50ml'],
    image: '',
    stock: 9,
    status: 'Disponible',
  },
];

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [catalog, setCatalog] = useState<Product[]>(fallbackProducts);

  // Busca sobre los productos reales creados en el admin
  useEffect(() => {
    const saved = readStorage(STORAGE_KEYS.products);
    if (!saved) return;
    try {
      const parsed: Product[] = JSON.parse(saved);
      const normalized = parsed.map(normalizeProduct);
      if (normalized.length > 0) setCatalog(normalized);
    } catch (e) {
      console.error('Error leyendo el catálogo guardado:', e);
    }
  }, []);

  const term = query.toLowerCase().trim();

  const results = catalog.filter((product) =>
    [product.name, product.category, product.subcategory?.name, product.description]
      .filter(Boolean)
      .some((field) => (field as string).toLowerCase().includes(term))
  );

  const formatCOP = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">

      {/* Encabezado con los datos de búsqueda */}
      <div className="border-b border-neutral-200 pb-6 mb-8">
        <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
          Búsqueda
        </span>
        <h1 className="text-2xl font-serif text-neutral-900 mt-1">
          Resultados para:{' '}
          {query ? (
            <span className="italic font-bold">&quot;{query}&quot;</span>
          ) : (
            <span className="italic">Todo el catálogo</span>
          )}
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          {results.length} producto(s) encontrado(s)
        </p>
      </div>

      {/* Grilla de Resultados */}
      {results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {results.map((item) => (
            <Link
              key={item.id}
              href={item.subcategory?.href || '/'}
              className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm group block"
            >
              <div className="aspect-square bg-neutral-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center text-2xl group-hover:bg-neutral-200 transition-colors">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  '🧴'
                )}
              </div>
              <span className="text-[9px] font-bold tracking-wider text-neutral-400 uppercase">
                {categoryLabel(item.category)}
                {item.subcategory?.name ? ` · ${item.subcategory.name}` : ''}
              </span>
              <h3 className="text-xs font-semibold text-neutral-900 mt-0.5">{item.name}</h3>
              <p className="text-xs font-bold text-neutral-800 pt-1">{formatCOP(item.price)}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200">
          <p className="text-neutral-500 text-sm">No encontramos ningún producto que coincida con tu búsqueda.</p>
          <Link href="/" className="inline-block mt-4 text-xs font-bold underline text-neutral-900 hover:text-neutral-600">
            ← Volver al inicio
          </Link>
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-[#F6F6F6] text-neutral-900 font-sans">
      <Suspense fallback={<div className="p-10 text-center text-xs font-medium text-neutral-500">Cargando resultados...</div>}>
        <SearchResultsContent />
      </Suspense>
    </div>
  );
}
