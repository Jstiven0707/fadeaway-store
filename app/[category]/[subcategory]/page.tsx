'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Product,
  STORAGE_KEYS,
  categoryLabel,
  findSubcategoryByHref,
  isLaunchHref,
  menuData,
  normalizeProduct,
  readStorage,
} from '@/lib/menu';

interface CartItem {
  id: number | string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  size?: string; // presentación elegida (se conserva el nombre por el carrito ya guardado)
  image?: string;
}

export default function SubCategoryPage() {
  const params = useParams();

  const categoryRaw = typeof params?.category === 'string' ? params.category : '';
  const subcategoryRaw = typeof params?.subcategory === 'string' ? params.subcategory : '';

  const href = `/${categoryRaw.toLowerCase()}/${subcategoryRaw.toLowerCase()}`;
  const categoryKey = categoryRaw.toUpperCase();

  // Nombre oficial del menú; si la URL no existe, se muestra el slug tal cual
  const subcategoryMatch = findSubcategoryByHref(href);
  const isLaunchSection = isLaunchHref(href);
  const categoryName = categoryLabel(categoryKey);
  const subcategoryName = isLaunchSection
    ? 'Nuevos Lanzamientos'
    : subcategoryMatch?.label || decodeURIComponent(subcategoryRaw).toUpperCase();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPresentations, setSelectedPresentations] = useState<Record<string, string>>({});
  const [addedItemNotice, setAddedItemNotice] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

  // --- CARGA DE PRODUCTOS CREADOS DESDE EL ADMIN ---
  const loadProducts = () => {
    const saved = readStorage(STORAGE_KEYS.products);
    if (!saved) {
      setProducts([]);
      return;
    }
    try {
      const parsed: Product[] = JSON.parse(saved);
      const normalized = parsed.map(normalizeProduct);

      const visible = normalized.filter((p) => {
        if (isLaunchSection) {
          return p.isNewRelease === true && p.category === categoryKey;
        }
        return p.subcategory?.href === href;
      });

      setProducts(visible);
    } catch (e) {
      console.error('Error leyendo los productos guardados:', e);
      setProducts([]);
    }
  };

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
    loadProducts();
    loadCartCount();

    const handleStorageChange = () => {
      loadProducts();
      loadCartCount();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);

  const handlePresentationChange = (productId: string, presentation: string) => {
    setSelectedPresentations((prev) => ({ ...prev, [productId]: presentation }));
  };

  // Guarda el producto en el carrito compartido con la home
  const addToCart = (product: Product) => {
    const presentation = selectedPresentations[product.id] || product.presentations[0] || 'Único';
    const cartKey = STORAGE_KEYS.cart;

    const existingCartRaw = localStorage.getItem(cartKey);
    let currentCart: CartItem[] = [];

    if (existingCartRaw) {
      try {
        currentCart = JSON.parse(existingCartRaw);
      } catch (e) {
        console.error('Error leyendo localStorage:', e);
      }
    }

    const existingIndex = currentCart.findIndex(
      (item) => item.id === product.id && item.size === presentation
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
        size: presentation,
        image: product.image,
      });
    }

    localStorage.setItem(cartKey, JSON.stringify(currentCart));

    // Avisa a la home para que refresque el contador del carrito
    window.dispatchEvent(new Event('storage'));
    loadCartCount();

    setAddedItemNotice(`¡${product.name} (${presentation}) agregado al carrito!`);
    setTimeout(() => setAddedItemNotice(null), 3000);
  };

  const formatCOP = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);

  // Otras subcategorías de la misma categoría, para seguir explorando
  const siblingLinks = (menuData[categoryKey] || [])
    .flatMap((group) => group.subcategories)
    .filter((sub) => sub.href !== href);

  return (
    <div className="min-h-screen bg-[#F6F6F6] text-neutral-900 font-sans pb-20 relative">

      {/* Banner superior */}
      <div className="bg-neutral-900 text-white text-[11px] font-medium tracking-wide text-center py-2 uppercase">
        Envíos Gratis por compras superiores a $150.000 COP
      </div>

      {/* Header Breve */}
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

      {/* Alerta flotante cuando agregas un producto */}
      {addedItemNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-black text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <span>✓</span>
          <span>{addedItemNotice}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 pt-10 space-y-10">

        {/* Título de la Sección */}
        <div className="border-b border-neutral-200 pb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
              Catálogo / {categoryName}
            </span>
            <h1 className="text-3xl font-serif italic text-neutral-900 mt-1">
              {subcategoryName}
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              {products.length} producto(s) disponible(s)
            </p>
          </div>
        </div>

        {/* Grilla de Productos */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {products.map((item) => {
              const activePresentation =
                selectedPresentations[item.id] || item.presentations[0] || 'Único';

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

                    {/* Seleccionar Presentación */}
                    {item.presentations.length > 0 && (
                      <div className="mb-4">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase block mb-1">
                          Presentación:
                        </label>
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {item.presentations.map((p) => (
                            <button
                              key={p}
                              onClick={() => handlePresentationChange(item.id, p)}
                              className={`px-2 py-1 border rounded font-semibold ${
                                activePresentation === p
                                  ? 'border-black bg-black text-white'
                                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
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

        {/* Seguir explorando la misma categoría */}
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
