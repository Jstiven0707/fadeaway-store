'use client';

import { useState, useEffect } from 'react';

// --- INTERFACES ---
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  sizes: string[];
  image: string;
  stock: number;
  status: 'Disponible' | 'Agotado';
}

interface OrderItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
}

interface Order {
  id: string;
  date: string; // ISO String (ej: 2026-03-15T10:30:00.000Z)
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
    name: 'Oversized Hoodie Black Edition',
    category: 'Hoodies',
    price: 180000,
    sizes: ['S', 'M', 'L', 'XL'],
    image: '/logo.png',
    stock: 15,
    status: 'Disponible',
  },
];

export default function AdminDashboard() {
  // 1. AUTENTICACIÓN Y NAVEGACIÓN
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'analytics'>('orders');

  // 2. ESTADOS DE PEDIDOS & PRODUCTOS
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showLabelModal, setShowLabelModal] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Camisetas',
    price: '',
    sizes: 'S, M, L, XL',
    image: '',
    stock: '',
    status: 'Disponible' as 'Disponible' | 'Agotado',
  });

  // 3. ESTADO VENTA MANUAL (WHATSAPP / FACEBOOK)
  const [isManualSaleOpen, setIsManualSaleOpen] = useState(false);
  const [manualSaleForm, setManualSaleForm] = useState({
    customerName: '',
    customerPhone: '',
    customerCity: '',
    customerAddress: '',
    channel: 'WhatsApp' as 'WhatsApp' | 'Facebook' | 'Instagram' | 'Directo',
    productId: '',
    size: 'M',
    quantity: '1',
    shippingFee: '0',
    paymentMethod: 'Transferencia Nequi/Bancolombia',
  });

  // CARGAR DATOS EN LOCALSTORAGE
  useEffect(() => {
    const savedOrders = localStorage.getItem('fadeaway_orders');
    if (savedOrders) {
      try { setOrders(JSON.parse(savedOrders)); } catch (e) { console.error(e); }
    }

    const savedProducts = localStorage.getItem('fadeaway_products');
    if (savedProducts) {
      try { setProducts(JSON.parse(savedProducts)); } catch (e) { console.error(e); }
    } else {
      setProducts(INITIAL_PRODUCTS);
      localStorage.setItem('fadeaway_products', JSON.stringify(INITIAL_PRODUCTS));
    }
  }, []);

  const saveOrders = (updated: Order[]) => {
    setOrders(updated);
    localStorage.setItem('fadeaway_orders', JSON.stringify(updated));
  };

  const saveProducts = (updated: Product[]) => {
    setProducts(updated);
    localStorage.setItem('fadeaway_products', JSON.stringify(updated));
  };

  // LOGIN
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

  // GESTIÓN PRODUCTOS
  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        category: product.category,
        price: product.price.toString(),
        sizes: product.sizes.join(', '),
        image: product.image,
        stock: product.stock.toString(),
        status: product.status,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        category: 'Camisetas',
        price: '',
        sizes: 'S, M, L, XL',
        image: '',
        stock: '10',
        status: 'Disponible',
      });
    }
    setIsProductModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm((prev) => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newProduct: Product = {
      id: editingProduct ? editingProduct.id : `PROD-${Date.now().toString().slice(-4)}`,
      name: productForm.name,
      category: productForm.category,
      price: Number(productForm.price),
      sizes: productForm.sizes.split(',').map((s) => s.trim().toUpperCase()),
      image: productForm.image || '/logo.png',
      stock: Number(productForm.stock),
      status: Number(productForm.stock) <= 0 ? 'Agotado' : productForm.status,
    };

    const updated = editingProduct
      ? products.map((p) => (p.id === editingProduct.id ? newProduct : p))
      : [newProduct, ...products];

    saveProducts(updated);
    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('¿Eliminar esta prenda del catálogo?')) {
      saveProducts(products.filter((p) => p.id !== id));
    }
  };

  // REGISTRAR VENTA MANUAL (WHATSAPP / FACEBOOK / INSTAGRAM)
  const handleRegisterManualSale = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProduct = products.find((p) => p.id === manualSaleForm.productId);
    if (!targetProduct) {
      alert('Selecciona una prenda válida');
      return;
    }

    const qty = Number(manualSaleForm.quantity);
    if (targetProduct.stock < qty) {
      alert(`Stock insuficiente. Solo quedan ${targetProduct.stock} unidades de ${targetProduct.name}.`);
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
        nombre: manualSaleForm.customerName,
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

    // Descontar inventario
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

    // Limpiar Formulario
    setManualSaleForm({
      customerName: '',
      customerPhone: '',
      customerCity: '',
      customerAddress: '',
      channel: 'WhatsApp',
      productId: '',
      size: 'M',
      quantity: '1',
      shippingFee: '0',
      paymentMethod: 'Transferencia Nequi/Bancolombia',
    });

    alert('Venta registrada exitosamente e inventario actualizado.');
  };

  // CAMBIO DE ESTADO PEDIDO
  const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
    const updated = orders.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord));
    saveOrders(updated);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filterStatus === 'TODOS') return true;
    return order.status.toUpperCase() === filterStatus.toUpperCase();
  });

  // CÁLCULO DE VENTAS MES A MES
  const calculateMonthlyStats = () => {
    const monthlyMap: { [key: string]: { totalSales: number; ordersCount: number; itemsCount: number } } = {};

    orders.forEach((order) => {
      if (order.status !== 'Cancelado') {
        const date = new Date(order.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { totalSales: 0, ordersCount: 0, itemsCount: 0 };
        }

        monthlyMap[monthKey].totalSales += order.total;
        monthlyMap[monthKey].ordersCount += 1;
        monthlyMap[monthKey].itemsCount += order.items.reduce((acc, item) => acc + item.quantity, 0);
      }
    });

    // Ordenar por fecha cronológica
    const sortedKeys = Object.keys(monthlyMap).sort();

    return sortedKeys.map((key) => {
      const [year, month] = key.split('-');
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const label = `${monthNames[parseInt(month, 10) - 1]} ${year}`;
      return {
        key,
        label,
        ...monthlyMap[key],
      };
    });
  };

  const monthlyStats = calculateMonthlyStats();
  const totalRevenue = orders
    .filter((o) => o.status !== 'Cancelado')
    .reduce((acc, curr) => acc + curr.total, 0);

  // LOGIN CON RETRO MARQUEE
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-black flex items-center justify-center p-4 font-sans overflow-hidden select-none">
        <div className="absolute inset-0 opacity-15 flex flex-col justify-between pointer-events-none rotate-[-6deg] scale-110">
          <div className="flex whitespace-nowrap animate-pulse text-[85px] font-black italic tracking-tighter text-neutral-400 gap-12">
            <span>FADEAWAY APPAREL</span>
            <span>HEAVYWEIGHT COTTON</span>
            <span>EST. 2026</span>
            <span>FADEAWAY STREETWEAR</span>
          </div>
          <div className="flex whitespace-nowrap text-[95px] font-black italic tracking-tighter text-neutral-300 gap-16 translate-x-[-120px]">
            <span>FADEAWAY CULT</span>
            <span>OVERSIZED CUT</span>
            <span>RAW ATHLETICS</span>
            <span>FADEAWAY</span>
          </div>
          <div className="flex whitespace-nowrap animate-pulse text-[85px] font-black italic tracking-tighter text-neutral-500 gap-12">
            <span>LIMITED EDITION</span>
            <span>FADEAWAY APPAREL</span>
            <span>PREMIUM QUALITY</span>
            <span>FADEAWAY</span>
          </div>
        </div>

        <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-md w-full border border-neutral-800">
          <div className="text-center mb-6">
            <div className="inline-block bg-black px-6 py-3 rounded-lg mb-3 shadow-xl">
              <img src="/logo.png" alt="FADEAWAY" className="h-8 w-auto object-contain" />
            </div>
            <h1 className="text-xl font-black text-neutral-900 tracking-tight uppercase">Acceso Restringido</h1>
            <p className="text-xs text-neutral-500 font-medium mt-1">Panel de Control de Inventario & Envíos</p>
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
                className="w-full bg-white border border-neutral-300 text-neutral-900 text-sm rounded-xl p-3 outline-none focus:border-black font-semibold placeholder:text-neutral-400"
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
                  className="w-full bg-white border border-neutral-300 text-neutral-900 text-sm rounded-xl p-3 pr-10 outline-none focus:border-black font-semibold placeholder:text-neutral-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black font-bold text-base p-1"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white font-bold py-3.5 rounded-xl uppercase tracking-wider hover:bg-neutral-800 transition-all shadow-lg active:scale-95 text-xs mt-2"
            >
              Entrar al Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // PANEL PRINCIPAL
  return (
    <div className="min-h-screen bg-[#F4F4F6] text-neutral-900 font-sans pb-12">
      {/* HEADER */}
      <header className="bg-black text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-md">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="FADEAWAY" className="h-7 w-auto object-contain" />
          <span className="bg-neutral-800 text-neutral-300 text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border border-neutral-700">
            Control General
          </span>
        </div>

        {/* NAVEGACIÓN PRINCIPAL */}
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
            👕 Catálogo ({products.length})
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
        {/* PESTAÑA 1: PEDIDOS */}
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
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              order.channel === 'WhatsApp' ? 'bg-emerald-100 text-emerald-800' :
                              order.channel === 'Facebook' ? 'bg-blue-100 text-blue-800' :
                              order.channel === 'Instagram' ? 'bg-pink-100 text-pink-800' : 'bg-neutral-200 text-neutral-800'
                            }`}>
                              {order.channel || 'Web'}
                            </span>
                          </td>
                          <td className="p-4 text-neutral-500">{new Date(order.date).toLocaleDateString('es-CO')}</td>
                          <td className="p-4 font-semibold">{order.customer.nombre} {order.customer.apellido}</td>
                          <td className="p-4 text-neutral-600">{order.customer.ciudad}</td>
                          <td className="p-4 font-bold text-neutral-900">{formatCOP(order.total)}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              order.status === 'Pagado' ? 'bg-emerald-100 text-emerald-800' :
                              order.status === 'Pendiente' ? 'bg-amber-100 text-amber-800' :
                              order.status === 'Enviado' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                            }`}>
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

        {/* PESTAÑA 2: PRODUCTOS */}
        {activeTab === 'products' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Gestión de Productos</h2>
                <p className="text-xs text-neutral-500">Agrega prendas, sube imágenes y edita precios fácilmente</p>
              </div>

              <button
                onClick={() => handleOpenProductModal()}
                className="bg-black hover:bg-neutral-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
              >
                + Crear Prenda
              </button>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-100 text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-200">
                      <th className="p-4">Foto</th>
                      <th className="p-4">Ref ID</th>
                      <th className="p-4">Prenda</th>
                      <th className="p-4">Categoría</th>
                      <th className="p-4">Precio</th>
                      <th className="p-4">Tallas</th>
                      <th className="p-4">Stock</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-medium">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-neutral-400">
                          No hay prendas agregadas.
                        </td>
                      </tr>
                    ) : (
                      products.map((prod) => (
                        <tr key={prod.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="p-4">
                            <img src={prod.image} alt={prod.name} className="h-10 w-10 object-cover rounded-lg border border-neutral-200 bg-black" />
                          </td>
                          <td className="p-4 font-bold text-neutral-900">{prod.id}</td>
                          <td className="p-4 font-bold text-sm text-neutral-900">{prod.name}</td>
                          <td className="p-4 text-neutral-600">{prod.category}</td>
                          <td className="p-4 font-bold text-neutral-900">{formatCOP(prod.price)}</td>
                          <td className="p-4">
                            {prod.sizes.map((s) => (
                              <span key={s} className="inline-block bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded text-[10px] font-bold mr-1">
                                {s}
                              </span>
                            ))}
                          </td>
                          <td className="p-4 font-bold">{prod.stock} un.</td>
                          <td className="p-4 text-center flex justify-center gap-2 mt-2">
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

        {/* PESTAÑA 3: VENTAS Y FLUJO MES A MES */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* TARJETAS RESUMEN DE IMPACTO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Ventas Totales Acumuladas</span>
                <p className="text-2xl font-black text-neutral-900">{formatCOP(totalRevenue)}</p>
                <p className="text-xs text-neutral-500 mt-1">Registradas por Web y Chat</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Total Pedidos Concretados</span>
                <p className="text-2xl font-black text-neutral-900">{orders.filter((o) => o.status !== 'Cancelado').length} Pedidos</p>
                <p className="text-xs text-emerald-600 font-bold mt-1">
                  {orders.filter((o) => o.channel && o.channel !== 'Web').length} ventas cerradas por Redes
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Prendas Vendidas</span>
                <p className="text-2xl font-black text-neutral-900">
                  {orders
                    .filter((o) => o.status !== 'Cancelado')
                    .reduce((acc, ord) => acc + ord.items.reduce((sum, item) => sum + item.quantity, 0), 0)}{' '}
                  Unidades
                </p>
                <p className="text-xs text-neutral-500 mt-1">Descontadas del Inventario</p>
              </div>
            </div>

            {/* TABLA DE CRECIMIENTO MES A MES */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Crecimiento e Ingresos Mes a Mes</h3>
                  <p className="text-xs text-neutral-500">Compara el comportamiento del negocio para medir el crecimiento</p>
                </div>
              </div>

              {monthlyStats.length === 0 ? (
                <div className="text-center py-10 text-neutral-400 text-xs">
                  Aún no hay ventas registradas para generar el historial de meses.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-100 text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-200">
                        <th className="p-3">Mes</th>
                        <th className="p-3">Ventas ($ COP)</th>
                        <th className="p-3">N° Pedidos</th>
                        <th className="p-3">Prendas Vendidas</th>
                        <th className="p-3">Ticket Promedio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 font-medium">
                      {monthlyStats.map((stat) => (
                        <tr key={stat.key} className="hover:bg-neutral-50 transition-colors">
                          <td className="p-3 font-bold text-neutral-900">{stat.label}</td>
                          <td className="p-3 font-black text-neutral-900">{formatCOP(stat.totalSales)}</td>
                          <td className="p-3">{stat.ordersCount} pedidos</td>
                          <td className="p-3">{stat.itemsCount} prendas</td>
                          <td className="p-3 font-semibold text-neutral-700">
                            {formatCOP(stat.ordersCount > 0 ? stat.totalSales / stat.ordersCount : 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL PARA REGISTRAR VENTA MANUAL (WHATSAPP / FACEBOOK) */}
      {isManualSaleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">💬 Registrar Venta por Chat / Redes</h3>
                <p className="text-[11px] text-neutral-500">Descuenta stock y suma al reporte financiero</p>
              </div>
              <button onClick={() => setIsManualSaleOpen(false)} className="text-neutral-400 hover:text-black font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleRegisterManualSale} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Canal de Venta</label>
                <select
                  value={manualSaleForm.channel}
                  onChange={(e) => setManualSaleForm({ ...manualSaleForm, channel: e.target.value as any })}
                  className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2.5 outline-none font-bold"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Directo">Venta Presencial / Directa</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Seleccionar Prenda Vendida</label>
                <select
                  required
                  value={manualSaleForm.productId}
                  onChange={(e) => setManualSaleForm({ ...manualSaleForm, productId: e.target.value })}
                  className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2.5 outline-none font-semibold"
                >
                  <option value="">-- Elige una prenda del catálogo --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {formatCOP(p.price)} (Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Talla</label>
                  <input
                    type="text"
                    required
                    value={manualSaleForm.size}
                    onChange={(e) => setManualSaleForm({ ...manualSaleForm, size: e.target.value.toUpperCase() })}
                    placeholder="ej. M"
                    className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2.5 outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={manualSaleForm.quantity}
                    onChange={(e) => setManualSaleForm({ ...manualSaleForm, quantity: e.target.value })}
                    className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2.5 outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-3">
                <span className="block font-bold text-neutral-800 uppercase mb-2">Datos del Cliente (Opcional)</span>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Nombre del cliente"
                    value={manualSaleForm.customerName}
                    onChange={(e) => setManualSaleForm({ ...manualSaleForm, customerName: e.target.value })}
                    className="bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Teléfono / WhatsApp"
                    value={manualSaleForm.customerPhone}
                    onChange={(e) => setManualSaleForm({ ...manualSaleForm, customerPhone: e.target.value })}
                    className="bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Ciudad"
                    value={manualSaleForm.customerCity}
                    onChange={(e) => setManualSaleForm({ ...manualSaleForm, customerCity: e.target.value })}
                    className="bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Dirección"
                    value={manualSaleForm.customerAddress}
                    onChange={(e) => setManualSaleForm({ ...manualSaleForm, customerAddress: e.target.value })}
                    className="bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-black hover:bg-neutral-800 text-white font-bold py-3 rounded-xl uppercase text-xs tracking-wider transition-colors"
                >
                  Registrar Venta
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualSaleOpen(false)}
                  className="bg-neutral-200 text-neutral-800 font-bold px-4 py-3 rounded-xl uppercase text-xs"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-200 mb-4">
              <h3 className="text-base font-bold text-neutral-900">
                {editingProduct ? `Editar Prenda (${editingProduct.id})` : 'Agregar Nueva Prenda'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-neutral-400 hover:text-black font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Nombre de la Prenda</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="ej. Oversized T-Shirt Heavyweight"
                  className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2.5 outline-none focus:border-black font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Categoría</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2.5 outline-none focus:border-black font-medium"
                  >
                    <option value="Camisetas">Camisetas</option>
                    <option value="Hoodies">Hoodies</option>
                    <option value="Pantalones">Pantalones</option>
                    <option value="Accesorios">Accesorios</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Precio (COP)</label>
                  <input
                    type="number"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="120000"
                    className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2.5 outline-none focus:border-black font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Tallas (por coma)</label>
                  <input
                    type="text"
                    required
                    value={productForm.sizes}
                    onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
                    placeholder="S, M, L, XL"
                    className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2.5 outline-none focus:border-black font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">Stock</label>
                  <input
                    type="number"
                    required
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    placeholder="10"
                    className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-lg p-2.5 outline-none focus:border-black font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Imagen de Producto</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-black file:text-white hover:file:bg-neutral-800"
                />
                {productForm.image && (
                  <div className="mt-2 flex items-center gap-3 bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                    <img src={productForm.image} alt="Vista previa" className="h-12 w-12 object-cover rounded bg-black" />
                    <span className="text-[10px] text-neutral-500 font-mono">Imagen lista</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-black hover:bg-neutral-800 text-white font-bold py-3 rounded-xl uppercase text-xs tracking-wider transition-colors"
                >
                  {editingProduct ? 'Guardar Cambios' : 'Crear Prenda'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="bg-neutral-200 text-neutral-800 font-bold px-4 py-3 rounded-xl uppercase text-xs"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE ORDEN */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-200">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Gestión de Pedido #{selectedOrder.id}</h3>
                <p className="text-xs text-neutral-500">Fecha: {new Date(selectedOrder.date).toLocaleString('es-CO')}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-neutral-400 hover:text-black font-bold text-lg">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4 text-xs">
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <h4 className="font-bold text-neutral-400 uppercase text-[10px] mb-2 tracking-wider">Datos del Destinatario</h4>
                <p className="font-bold text-sm text-neutral-900">{selectedOrder.customer.nombre} {selectedOrder.customer.apellido}</p>
                <p className="text-neutral-600 mt-1"><strong>Dirección:</strong> {selectedOrder.customer.direccion}</p>
                <p className="text-neutral-600"><strong>Ciudad:</strong> {selectedOrder.customer.ciudad}</p>
                <p className="text-neutral-600"><strong>Teléfono:</strong> {selectedOrder.customer.telefono}</p>
              </div>

              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-neutral-400 uppercase text-[10px] mb-2 tracking-wider">Cambiar Estado</h4>
                  <p className="mb-3">Método: <strong className="uppercase font-bold text-black">{selectedOrder.paymentMethod}</strong></p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['Pendiente', 'Pagado', 'Enviado', 'Cancelado'].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedOrder.id, st as Order['status'])}
                      className={`py-2 px-3 rounded-lg font-bold text-[11px] border ${
                        selectedOrder.status === st ? 'bg-black text-white border-black' : 'bg-white text-neutral-700 border-neutral-300'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowLabelModal(true)}
                className="flex-1 bg-black hover:bg-neutral-800 text-white font-bold py-3 rounded-xl uppercase text-xs tracking-wider transition-colors"
              >
                🏷 Generar Etiqueta de Envío
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ETIQUETA */}
      {showLabelModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative border-2 border-black">
            <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-center">
              <div>
                <div className="inline-block bg-black px-3 py-1.5 rounded">
                  <img src="/logo.png" alt="FADEAWAY" className="h-6 w-auto object-contain" />
                </div>
                <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mt-1">Etiqueta de Despacho</p>
              </div>
              <span className="text-xs font-black bg-black text-white px-2 py-1 rounded">#{selectedOrder.id}</span>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="border-b border-dashed border-neutral-300 pb-3">
                <span className="text-[10px] font-bold uppercase text-neutral-400 block">DESTINATARIO:</span>
                <p className="text-sm font-bold uppercase">{selectedOrder.customer.nombre} {selectedOrder.customer.apellido}</p>
                <p className="text-xs font-bold text-neutral-800">{selectedOrder.customer.direccion}</p>
                <p className="text-xs font-bold text-neutral-800">{selectedOrder.customer.ciudad}</p>
                <p className="text-xs">TEL: {selectedOrder.customer.telefono}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button onClick={() => window.print()} className="flex-1 bg-black text-white font-bold py-2.5 rounded-lg text-xs uppercase">🖨️ Imprimir</button>
              <button onClick={() => setShowLabelModal(false)} className="bg-neutral-200 text-neutral-800 font-bold px-4 py-2.5 rounded-lg text-xs uppercase">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}