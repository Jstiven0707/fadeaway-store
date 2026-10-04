'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsOpen(false);
    router.push(`/buscar?q=${encodeURIComponent(searchTerm.trim())}`);
    setSearchTerm('');
  };

  return (
    <>
      {/* Botón Buscar del menú */}
      <button
        onClick={() => setIsOpen(true)}
        className="hover:opacity-70 transition-opacity text-xs font-medium text-neutral-800"
      >
        Buscar
      </button>

      {/* Ventana modal flotante */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-black text-sm font-bold"
            >
              ✕
            </button>

            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">
              Buscar en FADEAWAY
            </h3>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Escribe lo que buscas (ej. Hoodie, Camiseta)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="flex-1 bg-neutral-100 border border-neutral-300 rounded-full px-5 py-2.5 text-sm outline-none focus:border-black text-neutral-900"
              />
              <button
                type="submit"
                className="bg-black text-white text-xs font-bold px-6 py-2.5 rounded-full hover:bg-neutral-800 transition-colors"
              >
                Buscar
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}