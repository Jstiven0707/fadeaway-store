'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { STORAGE_KEYS, categoryLabel, findSubcategoryByHref, isLaunchHref, menuData, readStorage } from '@/lib/menu';
import { Product, fetchProducts, formatCOP } from '@/lib/products';

interface CartItem {
  id: number | string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  size?: string; // presentación elegida
  image?: string;
}

export default function SubCategoryPage() {
  const params = useParams();

  const categoryRaw = typeof params?.category === 'string' ? params.category : '';
  const subcategoryRaw = typeof params?.subcategory === 'string' ? params.subcategory : '';

  const href = `/${categoryRaw.toLowerCase()}/${subcategoryRaw.toLowerCase()}`;
  const categoryKey = categoryRaw.toUpperCase();

  const subcategoryMatch = findSubcategoryByHref(href);
  const isLaunchSection = isLaunchHref(href);
  const categoryName = categoryLabel(categoryKey);
  const subcategoryName = isLaunchSection
    ? 'Nuevos Lanzamientos'
    : subcategoryMatch?.label || decodeURIComponent(subcategoryRaw).toUpperCase();

  const [products, setProducts] = useState<Product[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPresentations, setSelectedPresentations] = useState<Record<number, string>>({});
  const [addedItemNotice, setAddedItemNotice] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

  // Los productos ahora viven en MySQL: se piden a /api/products
  const cargarProductos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = isLaunchSection
        ? await fetchProducts({ categoria: categoryRaw.toLowerCase(), lanzamientos: true })
        : await fetchProducts({ href });
      setProducts(data);
    } catch (e) {
      console.error('Error cargando productos:', e);
      setError('No pudimos cargar los productos. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [href, isLaunchSection, categoryRaw]);

  const loadCartCount = () => {
    const saved = readStorage(STORAGE_KEYS.cart);
    if (!saved) {
      setCartCount(0);
      return;
    }
    try {
      const parsed: CartItem[] = JSON.parse(saved);
      setCartCount(parsed.reduce((acc, item) => acc + item.quantity, 0));
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  useEffect(() => {
    loadCartCount();
    window.addEventListener('storage', loadCartCount);
    return () => window.removeEventListener('storage', loadCartCount);
  }, []);

  const handlePresentationChange = (productId: number, presentation: string) => {
    setSelectedPresentations((prev) => ({ ...prev, [productId]: presentation }));
  };

  // El carrito sigue en el navegador: es de cada visitante hasta que confirma el pedido
  const addToCart = (product: Product) => {
    const disponibles = product.presentations.filter((p) => p.stock > 0);
    const elegida =
      selectedPresentations[product.id] || disponibles[0]?.nombre || product.presentations[0]?.nombre || 'Único';

    const existingCartRaw = readStorage(STORAGE_KEYS.cart);
    let currentCart: CartItem[] = [];

    if (existingCartRaw) {
      try {
        currentCart = JSON.parse(existingCartRaw);
      } catch (e) {
        console.error('Error leyendo el carrito:', e);
      }
    }

    const existingIndex = currentCart.findIndex(
      (item) => item.id === product.id && item.size === elegida
    );

    if (existingIndex > -1) {
      currentCart[existingIndex].quantity += 1;
    } else {
      currentCart.push({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: 1,
        size: elegida,
        image: product.image,
      });
    }

    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(currentCart));
    window.dispatchEvent(new Event('storage'));
    loadCartCount();

    setAddedItemNotice(`¡${product.name} (${elegida}) agregado al carrito!`);
    setTimeout(() => setAddedItemNotice(null), 3000);
  };

  const siblingLinks = (menuData[categoryKey] || [])
    .flatMap((group) => group.subcategories)
    .filter((sub) => sub.href !== href);

  return (
    <div className="min-h-screen bg-[#F6F6F6] text-neutral-900 font-sans pb-20 relative">

      <div className="bg-neutral-900 text-white text-[11px] font-medium tracking-wide text-center py-2 uppercase">
        Envíos Gratis por compras superiores a $150.000 COP
      </div>

      <header className="bg-white border-b border-neutral-200 py-4 px-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-xs font-bold text-neutral-500 hover:text-black flex items-center gap-1">
            ← Volver al Inicio
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-xs text-neutral-400 font-medium">
              <span>{categoryName}</span> / <span className="text-black font-bold">{subcategoryName}</span>
            </div>
            <Link
              href="/"
              className="bg-black text-white px-4 py-2 rounded-full font-semibold text-xs hover:bg-neutral-800 transition-colors flex items-center gap-2"
            >
              <span>Carrito</span>
              <span className="bg-white text-black text-[10px] px-2 py-0.5 rounded-full font-bold">
                {cartCount}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {addedItemNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-black text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <span>✓</span>
          <span>{addedItemNotice}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 pt-10 space-y-10">

        <div className="border-b border-neutral-200 pb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
              Catálogo / {categoryName}
            </span>
            <h1 className="text-3xl font-serif italic text-neutral-900 mt-1">
              {subcategoryName}
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              {cargando ? 'Cargando...' : `${products.length} producto(s) disponible(s)`}
            </p>
          </div>
        </div>

        {cargando ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-neutral-200/80 animate-pulse">
                <div className="aspect-square bg-neutral-200 rounded-xl mb-4" />
                <div className="h-3 bg-neutral-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-neutral-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-red-200">
            <span className="text-3xl block mb-3">⚠️</span>
            <p className="text-sm font-semibold text-neutral-800">{error}</p>
            <button
              onClick={cargarProductos}
              className="inline-block mt-5 bg-black text-white text-xs font-bold uppercase px-6 py-3 rounded-full hover:bg-neutral-800 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {products.map((item) => {
              const disponibles = item.presentations.filter((p) => p.stock > 0);
              const activa =
                selectedPresentations[item.id] || disponibles[0]?.nombre || item.presentations[0]?.nombre;

              return (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm group flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-square bg-neutral-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <span className="text-[11px] font-medium text-neutral-500 text-center px-3">
                          {item.name}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mb-3">
                      <span
                        className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase ${
                          item.status === 'Disponible'
                            ? 'text-emerald-600 bg-emerald-50'
                            : 'text-red-600 bg-red-50'
                        }`}
                      >
                        {item.status}
                      </span>
                      <h3 className="text-xs font-semibold text-neutral-900 pt-1">{item.name}</h3>
                      {item.description && (
                        <p className="text-[10px] text-neutral-500 line-clamp-2">{item.description}</p>
                      )}
                      <p className="text-xs font-bold text-neutral-900">{formatCOP(item.price)}</p>
                    </div>

                    {item.presentations.length > 0 && (
                      <div className="mb-4">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase block mb-1">
                          Presentación:
                        </label>
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {item.presentations.map((p) => {
                            const agotada = p.stock <= 0;
                            return (
                              <button
                                key={p.nombre}
                                onClick={() => handlePresentationChange(item.id, p.nombre)}
                                disabled={agotada}
                                title={agotada ? 'Sin stock' : `${p.stock} disponibles`}
                                className={`px-2 py-1 border rounded font-semibold transition-colors ${
                                  agotada
                                    ? 'border-neutral-100 text-neutral-300 line-through cursor-not-allowed'
                                    : activa === p.nombre
                                      ? 'border-black bg-black text-white'
                                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                                }`}
                              >
                                {p.nombre}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => addToCart(item)}
                    disabled={item.status === 'Agotado'}
                    className="w-full bg-black hover:bg-neutral-800 text-white text-[11px] font-bold py-2.5 rounded-xl transition-colors uppercase tracking-wider disabled:bg-neutral-300 disabled:cursor-not-allowed"
                  >
                    {item.status === 'Agotado' ? 'Agotado' : '+ Agregar al Carrito'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200">
            <span className="text-3xl block mb-3">🧴</span>
            <p className="text-sm font-semibold text-neutral-700">
              Todavía no hay productos en esta sección.
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Agrégalos desde el panel de administración y aparecerán aquí al instante.
            </p>
            <Link
              href="/"
              className="inline-block mt-5 text-xs font-bold underline text-neutral-900 hover:text-neutral-600"
            >
              ← Volver al inicio
            </Link>
          </div>
        )}

        {siblingLinks.length > 0 && (
          <section className="bg-white p-6 rounded-2xl border border-neutral-200/80">
            <h2 className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase mb-4">
              Más en {categoryName}
            </h2>
            <div className="flex flex-wrap gap-2">
              {siblingLinks.map((sub) => (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className="text-xs font-medium border border-neutral-300 px-4 py-2 rounded-full text-neutral-700 hover:border-black hover:text-black transition-colors"
                >
                  {sub.label}
                </Link>
              ))}
            </div>
          </section>
        )}

      </main>

    </div>
  );
}
