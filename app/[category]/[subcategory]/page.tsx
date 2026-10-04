'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface CartItem {
  id: number | string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  size?: string;
}

export default function SubCategoryPage() {
  const params = useParams();

  // Obtenemos categoría y subcategoría desde la URL
  const categoryRaw = typeof params?.category === 'string' ? params.category : 'General';
  const subcategoryRaw = typeof params?.subcategory === 'string' ? params.subcategory : 'Productos';

  const categoryName = categoryRaw.toUpperCase();
  const subcategoryName = subcategoryRaw.toUpperCase();

  // Generamos catálogo interactivo dinámico con precios reales en COP
  const products = Array.from({ length: 8 }, (_, i) => ({
    id: `${categoryRaw}-${subcategoryRaw}-${i + 1}`,
    name: `${subcategoryName.charAt(0) + subcategoryName.slice(1).toLowerCase()} Streetwear Drop #${i + 1}`,
    price: 85000 + i * 15000,
    tag: 'Disponible',
  }));

  const [selectedSizes, setSelectedSizes] = useState<Record<string | number, string>>({});
  const [addedItemNotice, setAddedItemNotice] = useState<string | null>(null);

  const handleSizeChange = (productId: string | number, size: string) => {
    setSelectedSizes((prev) => ({ ...prev, [productId]: size }));
  };

  // Función para guardar el producto directo en el carrito compartido
  const addToCart = (product: typeof products[0]) => {
    const size = selectedSizes[product.id] || 'M';
    const cartKey = 'fadeaway_cart';
    
    const existingCartRaw = localStorage.getItem(cartKey);
    let currentCart: CartItem[] = [];

    if (existingCartRaw) {
      try {
        currentCart = JSON.parse(existingCartRaw);
      } catch (e) {
        console.error("Error leyendo localStorage:", e);
      }
    }

    const existingIndex = currentCart.findIndex(
      (item) => item.id === product.id && item.size === size
    );

    if (existingIndex > -1) {
      currentCart[existingIndex].quantity += 1;
    } else {
      currentCart.push({
        id: product.id,
        name: product.name,
        category: categoryName,
        price: product.price,
        quantity: 1,
        size: size,
      });
    }

    localStorage.setItem(cartKey, JSON.stringify(currentCart));

    // Despachar evento para notificar cambio en vivo si la home/carrito está abierto
    window.dispatchEvent(new Event('storage'));

    setAddedItemNotice(`¡${product.name} (${size}) agregado al carrito!`);
    setTimeout(() => setAddedItemNotice(null), 3000);
  };

  const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  };

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
          <div className="text-xs text-neutral-400 font-medium">
            <span>{categoryName}</span> / <span className="text-black font-bold">{subcategoryName}</span>
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
            <h1 className="text-3xl font-serif italic text-neutral-900 mt-1 uppercase">
              {subcategoryName}
            </h1>
          </div>

          <div className="flex gap-3 text-xs">
            <button className="bg-white border border-neutral-300 px-4 py-2 rounded-full font-medium text-neutral-700 hover:border-black">
              Filtrar por Talla
            </button>
            <button className="bg-white border border-neutral-300 px-4 py-2 rounded-full font-medium text-neutral-700 hover:border-black">
              Ordenar por
            </button>
          </div>
        </div>

        {/* Grilla de Productos Con Talla, Precio Real y Botón Añadir */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {products.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm group flex flex-col justify-between">
              
              <div>
                <div className="relative aspect-square bg-neutral-200 rounded-xl mb-4 flex flex-col items-center justify-center p-4 text-center group-hover:bg-neutral-300 transition-colors">
                  <span className="text-2xl mb-1">👕</span>
                  <span className="text-[11px] font-medium text-neutral-500">{item.name}</span>
                </div>

                <div className="space-y-1 mb-3">
                  <span className="text-[9px] font-bold tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                    {item.tag}
                  </span>
                  <h3 className="text-xs font-semibold text-neutral-900 pt-1">
                    {item.name}
                  </h3>
                  <p className="text-xs font-bold text-neutral-900">
                    {formatCOP(item.price)}
                  </p>
                </div>

                {/* Seleccionar Talla */}
                <div className="mb-4">
                  <label className="text-[10px] text-neutral-400 font-bold uppercase block mb-1">Seleccionar Talla:</label>
                  <div className="flex gap-1 text-[10px]">
                    {['S', 'M', 'L', 'XL'].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSizeChange(item.id, s)}
                        className={`px-2 py-1 border rounded font-semibold ${
                          (selectedSizes[item.id] || 'M') === s
                            ? 'border-black bg-black text-white'
                            : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botón funcional de adición */}
              <button
                onClick={() => addToCart(item)}
                className="w-full bg-black hover:bg-neutral-800 text-white text-[11px] font-bold py-2.5 rounded-xl transition-colors uppercase tracking-wider"
              >
                + Agregar al Carrito
              </button>

            </div>
          ))}
        </div>

      </main>

    </div>
  );
}