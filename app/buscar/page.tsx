'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

// Productos simulados de prueba (Se reemplazarán más adelante con la Base de Datos / Prisma)
const mockProducts = [
  { id: '1', name: 'Camiseta Oversize Black', category: 'ROPA', price: '$90.000 COP' },
  { id: '2', name: 'Hoodie Fadeaway Classic', category: 'ROPA', price: '$140.000 COP' },
  { id: '3', name: 'Gorra Streetwear Logo', category: 'ACCESORIOS', price: '$50.000 COP' },
  { id: '4', name: 'Pantalón Cargo Beige', category: 'ROPA', price: '$120.000 COP' },
];

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  // Filtramos los productos según la búsqueda
  const results = mockProducts.filter((product) =>
    product.name.toLowerCase().includes(query.toLowerCase()) ||
    product.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      
      {/* Encabezado con los datos de búsqueda */}
      <div className="border-b border-neutral-200 pb-6 mb-8">
        <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
          Búsqueda
        </span>
        <h1 className="text-2xl font-serif text-neutral-900 mt-1">
          Resultados para: {query ? <span className="italic font-bold">"{query}"</span> : <span className="italic">Todas las prendas</span>}
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          {results.length} producto(s) encontrado(s)
        </p>
      </div>

      {/* Grilla de Resultados */}
      {results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {results.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm group">
              <div className="aspect-square bg-neutral-100 rounded-xl mb-4 flex items-center justify-center text-2xl group-hover:bg-neutral-200 transition-colors">
                🖼️
              </div>
              <span className="text-[9px] font-bold tracking-wider text-neutral-400 uppercase">
                {item.category}
              </span>
              <h3 className="text-xs font-semibold text-neutral-900 mt-0.5">{item.name}</h3>
              <p className="text-xs font-bold text-neutral-800 pt-1">{item.price}</p>
            </div>
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