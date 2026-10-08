'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { categoryLabel } from '@/lib/menu';
import { Product, fetchProducts, formatCOP } from '@/lib/products';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState<Product[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // La búsqueda la resuelve MySQL (nombre, descripción, subcategoría y categoría)
  useEffect(() => {
    let cancelado = false;

    (async () => {
      setCargando(true);
      setError(null);
      try {
        const data = await fetchProducts({ q: query || undefined, limit: 60 });
        if (!cancelado) setResults(data);
      } catch (e) {
        console.error('Error buscando productos:', e);
        if (!cancelado) setError('No pudimos realizar la búsqueda. Intenta de nuevo.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [query]);

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">

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
          {cargando ? 'Buscando...' : `${results.length} producto(s) encontrado(s)`}
        </p>
      </div>

      {cargando ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-neutral-200 animate-pulse">
              <div className="aspect-square bg-neutral-200 rounded-xl mb-4" />
              <div className="h-3 bg-neutral-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-neutral-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-red-200">
          <p className="text-sm font-semibold text-neutral-800">{error}</p>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {results.map((item) => (
            <Link
              key={item.id}
              href={item.subcategory.href}
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
                {categoryLabel(item.category)} · {item.subcategory.name}
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
