'use client';

import { useState, useEffect } from 'react';
import {
  CATEGORIES_PRINCIPALES,
  Product,
  STORAGE_KEYS,
  categoryLabel,
  getDefaultPresentations,
  getSubcategoriesForCategory,
  normalizeProduct,
  readStorage,
} from '@/lib/menu';

// --- INTERFACES DE PEDIDOS ---
// El menú y el tipo Product viven en lib/menu.ts (fuente única de verdad).
interface OrderItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  size?: string; // presentación vendida
}

interface Order {
  id: string;
  date: string;
  channel?: 'Web' | 'WhatsApp' | 'Facebook' | 'Instagram' | 'Directo';
  customer: {
    nombre: string;
    apellido: string;
    ciudad: string;
    direccion: string;
    telefono: string;
    notas?: string;
  };
  paymentMethod: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  status: 'Pendiente' | 'Pagado' | 'Enviado' | 'Cancelado';
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'PROD-001',
    name: 'Eau de Parfum Oceanpark Night',
    category: 'PERFUMERIA',
    subcategory: { name: 'Para Ella', href: '/perfumeria/mujer', image: '/logo-mark.png' },
    price: 120000,
    description: 'Fragancia floral amaderada de alta fijación, hasta 10 horas de duración.',
    presentations: ['30ml', '50ml', '100ml'],
    image: '/logo-mark.png',
    stock: 15,
    status: 'Disponible',
    isNewRelease: true,
  },
];

export default function AdminDashboard() {
  // 1. ESTADOS DE AUTENTICACIÓN Y NAVEGACIÓN
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'analytics'>('orders');

  // 2. ESTADOS DE PEDIDOS Y PRODUCTOS
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // FORMULARIO CON CATEGORÍA Y SUBCATEGORÍA VINCULADA AL MENÚ
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'PERFUMERIA',
    subcategoryName: '',
    subcategoryHref: '',
    subcategoryImage: '',
    price: '',
    description: '',
    presentations: getDefaultPresentations('PERFUMERIA'),
    image: '',
    stock: '',
    status: 'Disponible' as 'Disponible' | 'Agotado',
    isNewRelease: false,
  });

  // 3. ESTADO DE VENTA MANUAL POR REDES SOCIALES
  const [isManualSaleOpen, setIsManualSaleOpen] = useState(false);
  const [manualSaleForm, setManualSaleForm] = useState({
    customerName: '',
    customerPhone: '',
    customerCity: '',
    customerAddress: '',
    channel: 'WhatsApp' as 'WhatsApp' | 'Facebook' | 'Instagram' | 'Directo',
    productId: '',
    size: 'Único',
    quantity: '1',
    shippingFee: '0',
    paymentMethod: 'Transferencia Nequi/Bancolombia',
  });

  // CARGAR Y PERSISTIR DATOS EN LOCALSTORAGE
  useEffect(() => {
    const savedOrders = readStorage(STORAGE_KEYS.orders);
    if (savedOrders) {
      try {
        setOrders(JSON.parse(savedOrders));
      } catch (e) {
        console.error(e);
      }
    }

    const savedProducts = readStorage(STORAGE_KEYS.products);
    if (savedProducts) {
      try {
        const parsed: Product[] = JSON.parse(savedProducts);
        const normalized = parsed.map(normalizeProduct);
        setProducts(normalized);
        // Guardamos la versión migrada para que el home también la lea corregida
        localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(normalized));
      } catch (e) {
        console.error(e);
      }
    } else {
      setProducts(INITIAL_PRODUCTS);
      localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(INITIAL_PRODUCTS));
    }
  }, []);

  const saveOrders = (updated: Order[]) => {
    setOrders(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(updated));
    } catch (e) {
      console.error('No se pudieron guardar los pedidos:', e);
      alert('No se pudieron guardar los pedidos: el almacenamiento del navegador está lleno.');
    }
  };

  const saveProducts = (updated: Product[]) => {
    setProducts(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(updated));
    } catch (e) {
      console.error('No se pudieron guardar los productos:', e);
      alert(
        'No se pudo guardar: el almacenamiento del navegador está lleno. Usa imágenes más pequeñas o una URL en vez de subir el archivo.'
      );
    }
  };

  // LOGIN DE ACCESO
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (credentials.username === 'admin' && credentials.password === 'fadeaway2026') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Contraseña o usuario inválido');
    }
  };

  const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // GESTIÓN DE PRODUCTOS (CREACIÓN / EDICIÓN)
  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        category: product.category || 'PERFUMERIA',
        subcategoryName: product.subcategory?.name || '',
        subcategoryHref: product.subcategory?.href || '',
        subcategoryImage: product.subcategory?.image || '',
        price: product.price.toString(),
        description: product.description || '',
        presentations: product.presentations.join(', '),
        image: product.image,
        stock: product.stock.toString(),
        status: product.status,
        isNewRelease: product.isNewRelease || false,
      });
    } else {
      setEditingProduct(null);
      const defaultSubs = getSubcategoriesForCategory('PERFUMERIA');
      const initialSub = defaultSubs[0];

      setProductForm({
        name: '',
        category: 'PERFUMERIA',
        subcategoryName: initialSub?.label || '',
        subcategoryHref: initialSub?.href || '',
        subcategoryImage: '',
        price: '',
        description: '',
        presentations: getDefaultPresentations('PERFUMERIA'),
        image: '',
        stock: '10',
        status: 'Disponible',
        isNewRelease: false,
      });
    }
    setIsProductModalOpen(true);
  };

  // CAMBIO DE CATEGORÍA PRINCIPAL EN EL FORMULARIO
  const handleCategoryChangeInForm = (newCat: string) => {
    const subs = getSubcategoriesForCategory(newCat);
    const firstSub = subs[0];
    setProductForm((prev) => ({
      ...prev,
      category: newCat,
      subcategoryName: firstSub?.label || '',
      subcategoryHref: firstSub?.href || '',
      // Al crear un producto nuevo sugerimos la presentación típica de la categoría
      presentations: editingProduct ? prev.presentations : getDefaultPresentations(newCat),
    }));
  };

  // CAMBIO DE SUBCATEGORÍA ESPECÍFICA
  const handleSubcategoryChangeInForm = (subLabel: string) => {
    const subs = getSubcategoriesForCategory(productForm.category);
    const found = subs.find((s) => s.label === subLabel);
    setProductForm((prev) => ({
      ...prev,
      subcategoryName: subLabel,
      subcategoryHref: found?.href || '',
    }));
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'image' | 'subcategoryImage'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm((prev) => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    // Si el select quedó vacío o con un valor inválido, recalculamos el href desde el menú
    const subs = getSubcategoriesForCategory(productForm.category);
    const matchedSub = subs.find((s) => s.label === productForm.subcategoryName);
    const finalHref = matchedSub?.href || productForm.subcategoryHref;

    const newProduct: Product = {
      id: editingProduct ? editingProduct.id : `PROD-${Date.now().toString().slice(-4)}`,
      name: productForm.name,
      category: productForm.category,
      subcategory: productForm.subcategoryName
        ? {
            name: productForm.subcategoryName,
            href: finalHref,
            image: productForm.subcategoryImage || undefined,
          }
        : undefined,
      price: Number(productForm.price),
      description: productForm.description,
      presentations: productForm.presentations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      image: productForm.image || '/logo-mark.png',
      stock: Number(productForm.stock),
      status: Number(productForm.stock) <= 0 ? 'Agotado' : productForm.status,
      isNewRelease: productForm.isNewRelease === true,
    };

    const updated = editingProduct
      ? products.map((p) => (p.id === editingProduct.id ? newProduct : p))
      : [newProduct, ...products];

    saveProducts(updated);
    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('¿Deseas eliminar este producto del catálogo definitivamente?')) {
      saveProducts(products.filter((p) => p.id !== id));
    }
  };

  // CAMBIAR ESTADO DE UNA ORDEN
  const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
    saveOrders(updated);
    setSelectedOrder((prev) => (prev && prev.id === orderId ? { ...prev, status: newStatus } : prev));
  };

  // REGISTRAR VENTA MANUAL POR CHAT (WHATSAPP / REDES)
  const handleRegisterManualSale = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProduct = products.find((p) => p.id === manualSaleForm.productId);
    if (!targetProduct) {
      alert('Selecciona un producto válido');
      return;
    }

    const qty = Number(manualSaleForm.quantity);
    if (targetProduct.stock < qty) {
      alert(`Stock insuficiente. Quedan ${targetProduct.stock} unidades disponibles.`);
      return;
    }

    const subtotal = targetProduct.price * qty;
    const shipping = Number(manualSaleForm.shippingFee);
    const total = subtotal + shipping;

    const newOrder: Order = {
      id: `ORD-M${Date.now().toString().slice(-5)}`,
      date: new Date().toISOString(),
      channel: manualSaleForm.channel,
      customer: {
        nombre: manualSaleForm.customerName || 'Cliente Chat',
        apellido: '',
        ciudad: manualSaleForm.customerCity || 'No especificada',
        direccion: manualSaleForm.customerAddress || 'No especificada',
        telefono: manualSaleForm.customerPhone || 'N/A',
      },
      paymentMethod: manualSaleForm.paymentMethod,
      items: [
        {
          id: targetProduct.id,
          name: targetProduct.name,
          price: targetProduct.price,
          quantity: qty,
          size: manualSaleForm.size,
        },
      ],
      subtotal,
      shippingFee: shipping,
      total,
      status: 'Pagado',
    };

    const updatedProducts = products.map((p) => {
      if (p.id === targetProduct.id) {
        const newStock = p.stock - qty;
        return {
          ...p,
          stock: newStock,
          status: newStock <= 0 ? ('Agotado' as const) : p.status,
        };
      }
      return p;
    });

    saveProducts(updatedProducts);
    saveOrders([newOrder, ...orders]);
    setIsManualSaleOpen(false);

    setManualSaleForm({
      customerName: '',
      customerPhone: '',
      customerCity: '',
      customerAddress: '',
      channel: 'WhatsApp',
      productId: '',
      size: 'Único',
      quantity: '1',
      shippingFee: '0',
      paymentMethod: 'Transferencia Nequi/Bancolombia',
    });

    alert('Venta registrada con éxito y stock actualizado.');
  };

  const filteredOrders = orders.filter((order) => {
    if (filterStatus === 'TODOS') return true;
    return order.status.toUpperCase() === filterStatus.toUpperCase();
  });

  // --- ESTADÍSTICAS (solo cuentan órdenes Pagado o Enviado) ---
  const paidOrders = orders.filter((o) => o.status === 'Pagado' || o.status === 'Enviado');

  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);

  const monthlyStats = (() => {
    const map = new Map<
      string,
      { key: string; label: string; totalSales: number; ordersCount: number; itemsCount: number }
    >();

    paidOrders.forEach((o) => {
      const d = new Date(o.date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const existing = map.get(key) ?? {
        key,
        label: d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
        totalSales: 0,
        ordersCount: 0,
        itemsCount: 0,
      };
      existing.totalSales += o.total;
      existing.ordersCount += 1;
      existing.itemsCount += o.items.reduce((acc, it) => acc + it.quantity, 0);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  })();

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-black flex items-center justify-center p-4 font-sans overflow-hidden select-none">
        <div className="absolute inset-0 opacity-15 flex flex-col justify-between pointer-events-none rotate-[-6deg] scale-110">
          <div className="flex whitespace-nowrap animate-pulse text-[85px] font-black italic tracking-tighter text-neutral-400 gap-12">
            <span>OCEANPARK BEAUTY</span>
            <span>HEAVYWEIGHT COTTON</span>
            <span>EST. 2026</span>
          </div>
        </div>

        <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-md w-full border border-neutral-800">
          <div className="text-center mb-6">
            <div className="inline-block bg-black px-6 py-3 rounded-lg mb-3 shadow-xl">
              <img src="/logo-wordmark.png" alt="OCEANPARK" className="h-14 w-auto object-contain brightness-0 invert" />
            </div>
            <h1 className="text-xl font-black text-neutral-900 tracking-tight uppercase">Acceso Restringido</h1>
            <p className="text-xs text-neutral-500 font-medium mt-1">Panel de Administración de Tienda</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-center font-bold tracking-wide">
                ⚠️ {loginError}
              </div>
            )}

            <div>
              <label className="block font-bold text-neutral-800 uppercase mb-1">Usuario</label>
              <input
                type="text"
                required
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                placeholder="Ingresa tu usuario"
                className="w-full bg-white border border-neutral-300 text-neutral-900 text-sm rounded-xl p-3 outline-none focus:border-black font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-800 uppercase mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-white border border-neutral-300 text-neutral-900 text-sm rounded-xl p-3 pr-10 outline-none focus:border-black font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black font-bold text-base p-1"
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white font-bold py-3.5 rounded-xl uppercase tracking-wider hover:bg-neutral-800 transition-all shadow-lg text-xs mt-2"
            >
              Entrar al Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F6] text-neutral-900 font-sans pb-12">
      {/* HEADER */}
      <header className="bg-black text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-md">
        <div className="flex items-center gap-4">
          <img src="/logo-wordmark.png" alt="OCEANPARK" className="h-11 sm:h-12 w-auto object-contain brightness-0 invert" />
          <span className="bg-neutral-800 text-neutral-300 text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border border-neutral-700">
            Control General
          </span>
        </div>

        <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'orders' ? 'bg-white text-black shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            📋 Pedidos ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'products' ? 'bg-white text-black shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            💄 Catálogo ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'analytics' ? 'bg-white text-black shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            📊 Ventas & Flujo
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsManualSaleOpen(true)}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            💬 + Venta Chat
          </button>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1.5 rounded-lg font-semibold transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {/* TAB 1: PEDIDOS */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Recepción de Órdenes</h2>
                <p className="text-xs text-neutral-500">Gestión de envíos, ventas Web y por Redes Sociales</p>
              </div>

              <div className="flex gap-2 text-xs font-semibold overflow-x-auto w-full sm:w-auto">
                {['TODOS', 'PENDIENTE', 'PAGADO', 'ENVIADO', 'CANCELADO'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                      filterStatus === status
                        ? 'bg-black text-white font-bold'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-100 text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-200">
                      <th className="p-4">N° Orden</th>
                      <th className="p-4">Origen</th>
                      <th className="p-4">Fecha</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Ciudad</th>
                      <th className="p-4">Total</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-medium">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-neutral-400">
                          No hay pedidos registrados.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="p-4 font-bold text-neutral-900">{order.id}</td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                order.channel === 'WhatsApp'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.channel === 'Facebook'
                                  ? 'bg-blue-100 text-blue-800'
                                  : order.channel === 'Instagram'
                                  ? 'bg-pink-100 text-pink-800'
                                  : 'bg-neutral-200 text-neutral-800'
                              }`}
                            >
                              {order.channel || 'Web'}
                            </span>
                          </td>
                          <td className="p-4 text-neutral-500">
                            {new Date(order.date).toLocaleDateString('es-CO')}
                          </td>
                          <td className="p-4 font-semibold">
                            {order.customer.nombre} {order.customer.apellido}
                          </td>
                          <td className="p-4 text-neutral-600">{order.customer.ciudad}</td>
                          <td className="p-4 font-bold text-neutral-900">{formatCOP(order.total)}</td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                order.status === 'Pagado'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.status === 'Pendiente'
                                  ? 'bg-amber-100 text-amber-800'
                                  : order.status === 'Enviado'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="bg-neutral-900 hover:bg-black text-white px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors"
                            >
                              Gestionar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTOS */}
        {activeTab === 'products' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Gestión de Productos</h2>
                <p className="text-xs text-neutral-500">
                  Agrega o edita nombres, descripciones, fotos, precios y stock
                </p>
              </div>

              <button
                onClick={() => handleOpenProductModal()}
                className="bg-black hover:bg-neutral-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
              >
                + Crear Producto
              </button>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-100 text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-200">
                      <th className="p-4">Foto</th>
                      <th className="p-4">Ref ID</th>
                      <th className="p-4">Producto</th>
                      <th className="p-4">Categoría / Subcategoría</th>
                      <th className="p-4">Precio</th>
                      <th className="p-4">Presentaciones</th>
                      <th className="p-4">Stock</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-medium">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-neutral-400">
                          No hay productos registrados en el catálogo.
                        </td>
                      </tr>
                    ) : (
                      products.map((prod) => (
                        <tr key={prod.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="p-4">
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="h-12 w-12 object-contain rounded-lg border border-neutral-200 bg-white p-1"
                            />
                          </td>
                          <td className="p-4 font-bold text-neutral-900">{prod.id}</td>
                          <td className="p-4 max-w-xs">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm text-neutral-900">{prod.name}</p>
                              {prod.isNewRelease && (
                                <span className="bg-black text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  Nuevo
                                </span>
                              )}
                            </div>
                            {prod.description && (
                              <p className="text-[11px] text-neutral-500 truncate mt-0.5">{prod.description}</p>
                            )}
                          </td>
                          <td className="p-4 text-neutral-600">
                            <span className="font-bold text-neutral-900">{categoryLabel(prod.category)}</span>
                            {prod.subcategory ? (
                              <div className="flex items-center gap-1.5 mt-1">
                                {prod.subcategory.image && (
                                  <img
                                    src={prod.subcategory.image}
                                    alt={prod.subcategory.name}
                                    className="h-4 w-4 rounded object-cover border border-neutral-200"
                                  />
                                )}
                                <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">
                                  {prod.subcategory.name}
                                </span>
                              </div>
                            ) : (
                              <div className="mt-1">
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                  Sin subcategoría: edítalo
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-bold text-neutral-900">{formatCOP(prod.price)}</td>
                          <td className="p-4">
                            {prod.presentations.map((s) => (
                              <span
                                key={s}
                                className="inline-block bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded text-[10px] font-bold mr-1"
                              >
                                {s}
                              </span>
                            ))}
                          </td>
                          <td className="p-4 font-bold">{prod.stock} un.</td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleOpenProductModal(prod)}
                                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod.id)}
                                className="bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-colors"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Ventas Totales (Pagadas y Enviadas)
                </p>
                <p className="text-2xl font-black text-neutral-900 mt-1">{formatCOP(totalRevenue)}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Órdenes Totales</p>
                <p className="text-2xl font-black text-neutral-900 mt-1">
                  {orders.filter((o) => o.status !== 'Cancelado').length}
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Productos en Catálogo
                </p>
                <p className="text-2xl font-black text-neutral-900 mt-1">{products.length}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4">
                Flujo de Ventas Mes a Mes
              </h3>
              {monthlyStats.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-6">
                  Aún no hay ventas pagadas para mostrar estadísticas.
                </p>
              ) : (
                <div className="space-y-4">
                  {monthlyStats.map((stat) => (
                    <div key={stat.key} className="border-b border-neutral-100 pb-4 last:border-0">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-bold text-neutral-800 capitalize">{stat.label}</span>
                        <span className="font-black text-neutral-900">{formatCOP(stat.totalSales)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-neutral-500">
                        <span>{stat.ordersCount} órdenes realizadas</span>
                        <span>{stat.itemsCount} prendas vendidas</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE CREACIÓN / EDICIÓN DE PRODUCTO */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-neutral-100 pb-3">
              <h3 className="font-black text-neutral-900 text-base uppercase">
                {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-neutral-400 hover:text-black font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block font-bold text-neutral-800 uppercase mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ej. Eau de Parfum Night"
                  className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-sm text-neutral-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">Categoría Principal</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => handleCategoryChangeInForm(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-sm text-neutral-900"
                  >
                    {CATEGORIES_PRINCIPALES.map((cat) => (
                      <option key={cat} value={cat}>
                        {categoryLabel(cat)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">
                    Subcategoría Específica
                  </label>
                  <select
                    value={productForm.subcategoryName}
                    onChange={(e) => handleSubcategoryChangeInForm(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-sm text-neutral-900"
                  >
                    {!productForm.subcategoryName && (
                      <option value="" disabled>
                        -- Elige una subcategoría --
                      </option>
                    )}
                    {getSubcategoriesForCategory(productForm.category).map((sub) => (
                      <option key={sub.label} value={sub.label}>
                        {sub.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Opción para marcar si es un nuevo lanzamiento */}
              <div className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="block font-bold text-neutral-900 uppercase">
                    ¿Mostrar en Nuevos Lanzamientos?
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    Se muestra en Nuevos Lanzamientos además de su subcategoría. Déjalo apagado si no es novedad.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={productForm.isNewRelease}
                  onChange={(e) => setProductForm({ ...productForm, isNewRelease: e.target.checked })}
                  className="h-5 w-5 accent-black rounded cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">Precio (COP)</label>
                  <input
                    type="number"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="180000"
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-sm text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">Stock Disponible</label>
                  <input
                    type="number"
                    required
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    placeholder="15"
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-sm text-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-800 uppercase mb-1">
                  Presentaciones Disponibles (ml, g, Único — separadas por comas)
                </label>
                <input
                  type="text"
                  required
                  value={productForm.presentations}
                  onChange={(e) => setProductForm({ ...productForm, presentations: e.target.value })}
                  placeholder="30ml, 50ml, 100ml"
                  className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-sm text-neutral-900"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-800 uppercase mb-1">Descripción del Producto</label>
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Notas olfativas, ingredientes, modo de uso..."
                  className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-sm text-neutral-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">
                    Imagen del Producto (URL o Archivo)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'image')}
                    className="w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-neutral-900 file:text-white hover:file:bg-black cursor-pointer mb-2"
                  />
                  <input
                    type="text"
                    value={productForm.image.startsWith('data:') ? '' : productForm.image}
                    onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                    placeholder={
                      productForm.image.startsWith('data:') ? 'Imagen cargada desde archivo' : '/logo-mark.png o https://...'
                    }
                    className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 outline-none focus:border-black text-xs font-semibold text-neutral-900"
                  />
                </div>

                <div className="flex flex-col items-center justify-center border border-dashed border-neutral-300 rounded-xl p-3 bg-neutral-50">
                  {productForm.image ? (
                    <img
                      src={productForm.image}
                      alt="Vista previa"
                      className="h-20 w-20 object-contain rounded-lg border border-neutral-200 bg-white p-1"
                    />
                  ) : (
                    <span className="text-neutral-400 text-[11px]">Vista previa de foto</span>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="w-1/2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold py-3 rounded-xl uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-black hover:bg-neutral-800 text-white font-bold py-3 rounded-xl uppercase tracking-wider transition-all shadow-lg"
                >
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE REGISTRO DE VENTA MANUAL */}
      {isManualSaleOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-neutral-100 pb-3">
              <h3 className="font-black text-neutral-900 text-base uppercase">Registrar Venta por Chat / Redes</h3>
              <button
                onClick={() => setIsManualSaleOpen(false)}
                className="text-neutral-400 hover:text-black font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterManualSale} className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">Canal de Venta</label>
                  <select
                    value={manualSaleForm.channel}
                    onChange={(e) =>
                      setManualSaleForm({
                        ...manualSaleForm,
                        channel: e.target.value as 'WhatsApp' | 'Facebook' | 'Instagram' | 'Directo',
                      })
                    }
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Directo">Directo</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">Nombre del Cliente</label>
                  <input
                    type="text"
                    required
                    value={manualSaleForm.customerName}
                    onChange={(e) => setManualSaleForm({ ...manualSaleForm, customerName: e.target.value })}
                    placeholder="Ej. Carlos Pérez"
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={manualSaleForm.customerPhone}
                    onChange={(e) => setManualSaleForm({ ...manualSaleForm, customerPhone: e.target.value })}
                    placeholder="3001234567"
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={manualSaleForm.customerCity}
                    onChange={(e) => setManualSaleForm({ ...manualSaleForm, customerCity: e.target.value })}
                    placeholder="Bogotá D.C."
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-800 uppercase mb-1">Dirección de Envío</label>
                <input
                  type="text"
                  value={manualSaleForm.customerAddress}
                  onChange={(e) => setManualSaleForm({ ...manualSaleForm, customerAddress: e.target.value })}
                  placeholder="Calle 100 # 15-20"
                  className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                />
              </div>

              <div className="border-t border-neutral-100 pt-3">
                <label className="block font-bold text-neutral-800 uppercase mb-1">
                  Seleccionar Producto del Catálogo
                </label>
                <select
                  required
                  value={manualSaleForm.productId}
                  onChange={(e) => setManualSaleForm({ ...manualSaleForm, productId: e.target.value })}
                  className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                >
                  <option value="">-- Elige un producto --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {formatCOP(p.price)} (Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">Presentación</label>
                  <input
                    type="text"
                    value={manualSaleForm.size}
                    onChange={(e) => setManualSaleForm({ ...manualSaleForm, size: e.target.value })}
                    placeholder="100ml"
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={manualSaleForm.quantity}
                    onChange={(e) => setManualSaleForm({ ...manualSaleForm, quantity: e.target.value })}
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">Costo Envío</label>
                  <input
                    type="number"
                    value={manualSaleForm.shippingFee}
                    onChange={(e) => setManualSaleForm({ ...manualSaleForm, shippingFee: e.target.value })}
                    placeholder="10000"
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-800 uppercase mb-1">Método de Pago</label>
                <input
                  type="text"
                  value={manualSaleForm.paymentMethod}
                  onChange={(e) => setManualSaleForm({ ...manualSaleForm, paymentMethod: e.target.value })}
                  className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsManualSaleOpen(false)}
                  className="w-1/2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold py-3 rounded-xl uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl uppercase tracking-wider transition-all shadow-lg"
                >
                  Registrar Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE / GESTIÓN DE ORDEN */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-black text-neutral-900 text-base uppercase">Orden: {selectedOrder.id}</h3>
                <p className="text-[11px] text-neutral-500">
                  {new Date(selectedOrder.date).toLocaleString('es-CO')}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-neutral-400 hover:text-black font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                <p className="font-bold text-neutral-900 uppercase mb-1">Datos del Cliente</p>
                <p className="font-semibold text-neutral-800">
                  {selectedOrder.customer.nombre} {selectedOrder.customer.apellido}
                </p>
                <p className="text-neutral-600">Teléfono: {selectedOrder.customer.telefono}</p>
                <p className="text-neutral-600">Ciudad: {selectedOrder.customer.ciudad}</p>
                <p className="text-neutral-600">Dirección: {selectedOrder.customer.direccion}</p>
                {selectedOrder.customer.notas && (
                  <p className="text-neutral-600">Notas: {selectedOrder.customer.notas}</p>
                )}
              </div>

              <div>
                <p className="font-bold text-neutral-900 uppercase mb-2">Artículos Comprados</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-neutral-50 p-2.5 rounded-lg border border-neutral-200"
                    >
                      <div>
                        <p className="font-bold text-neutral-900">{it.name}</p>
                        <p className="text-[11px] text-neutral-500">
                          Presentación: {it.size || 'N/A'} | Cantidad: {it.quantity}
                        </p>
                      </div>
                      <span className="font-bold text-neutral-900">{formatCOP(it.price * it.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-1 text-right">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal:</span>
                  <span>{formatCOP(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Envío:</span>
                  <span>{formatCOP(selectedOrder.shippingFee)}</span>
                </div>
                <div className="flex justify-between font-black text-neutral-900 text-sm pt-2 border-t border-neutral-200">
                  <span>Total Pagado:</span>
                  <span>{formatCOP(selectedOrder.total)}</span>
                </div>
                <p className="text-[11px] text-neutral-500 text-left mt-2">
                  Método de pago: <span className="font-bold text-neutral-800">{selectedOrder.paymentMethod}</span>
                </p>
              </div>

              <div>
                <label className="block font-bold text-neutral-800 uppercase mb-1">Cambiar Estado de la Orden</label>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as Order['status'])}
                  className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900 text-xs"
                >
                  <option value="Pendiente">PENDIENTE</option>
                  <option value="Pagado">PAGADO</option>
                  <option value="Enviado">ENVIADO</option>
                  <option value="Cancelado">CANCELADO</option>
                </select>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-neutral-100 text-right">
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-black text-white font-bold px-5 py-2.5 rounded-xl uppercase tracking-wider text-xs"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}