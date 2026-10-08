'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CATEGORIES_PRINCIPALES,
  categoryLabel,
  getDefaultPresentations,
  getSubcategoriesForCategory,
} from '@/lib/menu';
import {
  AjustesPago,
  BANDEJAS,
  Bandeja,
  ESTADOS,
  PERIODOS,
  Pago,
  Periodo,
  EstadoOrden,
  METODOS_PAGO,
  MetodoPago,
  Pedido,
  cambiarEstadoPedido,
  crearPedido,
  eliminarPedido,
  fetchAjustes,
  fetchPagos,
  fetchPedidos,
  guardarAjustes,
  rangoDe,
} from '@/lib/pedidos';
import {
  EstadoSesion,
  ROLES,
  Rol,
  Usuario,
  UsuarioInput,
  actualizarUsuario,
  cambiarMiPassword,
  cerrarSesion,
  crearPrimerUsuario,
  generarEnlaceClave,
  crearUsuario,
  eliminarUsuario,
  fetchSesion,
  fetchUsuarios,
  iniciarSesion,
  puede,
} from '@/lib/usuarios';
import {
  Presentacion,
  Product,
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
  uploadProductImage,
} from '@/lib/products';

// --- INTERFACES DE PEDIDOS ---
// El menú vive en lib/menu.ts; el tipo Product y el cliente de la API en lib/products.ts.
/** Presentaciones sugeridas al crear un producto, segun la categoria. */
const presentacionesPorDefecto = (categoria: string): Presentacion[] =>
  getDefaultPresentations(categoria)
    .split(',')
    .map((nombre) => ({ nombre: nombre.trim(), stock: 0 }))
    .filter((p) => p.nombre.length > 0);

export default function AdminDashboard() {
  // 1. ESTADOS DE AUTENTICACIÓN Y NAVEGACIÓN
  // null mientras se consulta la sesion al servidor
  const [sesion, setSesion] = useState<EstadoSesion | null>(null);
  const [credentials, setCredentials] = useState({
    identificador: '', password: '', nombre: '', usuario: '', email: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [entrando, setEntrando] = useState(false);

  const usuario = sesion?.usuario ?? null;
  const isAuthenticated = !!usuario;
  const permiso = (p: Parameters<typeof puede>[1]) => puede(usuario?.rol, p);

  // Usuarios del panel (solo los ve el owner)
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioForm, setUsuarioForm] = useState<UsuarioInput & { id?: number }>({
    nombre: '', usuario: '', email: '', password: '', rol: 'ASESOR', activo: true,
  });
  const [miClave, setMiClave] = useState({ actual: '', nueva: '', abierto: false });
  const [errorMiClave, setErrorMiClave] = useState<string | null>(null);
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [errorUsuario, setErrorUsuario] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'analytics' | 'settings' | 'usuarios'>('orders');

  // 2. ESTADOS DE PEDIDOS Y PRODUCTOS
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [filterStatus, setFilterStatus] = useState<EstadoOrden | 'TODOS'>('TODOS');
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [bandeja, setBandeja] = useState<Bandeja>('pagos');
  const [refPago, setRefPago] = useState('');
  const [cargandoPedidos, setCargandoPedidos] = useState(true);
  const [errorPedidos, setErrorPedidos] = useState<string | null>(null);
  const [moviendoEstado, setMoviendoEstado] = useState(false);

  // Ventas: pagos recibidos dentro de un rango de fechas
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [rango, setRango] = useState(() => rangoDe('mes'));
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);

  // Datos de pago configurables (Nequi, Daviplata, WhatsApp)
  const [ajustes, setAjustes] = useState<AjustesPago | null>(null);
  const [guardandoAjustes, setGuardandoAjustes] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // FORMULARIO CON CATEGORÍA Y SUBCATEGORÍA VINCULADA AL MENÚ
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'PERFUMERIA',
    subcategoryName: '',
    subcategoryHref: '',
    price: '',
    description: '',
    presentations: presentacionesPorDefecto('PERFUMERIA'),
    image: '',
    isNewRelease: false,
  });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  // Estado de la carga de productos desde la base
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState<string | null>(null);

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
    paymentMethod: 'NEQUI' as MetodoPago,
  });

  const cargarPedidos = useCallback(async () => {
    setCargandoPedidos(true);
    setErrorPedidos(null);
    try {
      setOrders(await fetchPedidos());
    } catch (e) {
      console.error('Error cargando pedidos:', e);
      setErrorPedidos('No se pudieron cargar los pedidos desde la base de datos.');
    } finally {
      setCargandoPedidos(false);
    }
  }, []);

  // Los pagos se recargan cada vez que cambia el rango de fechas
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'analytics') return;
    let cancelado = false;
    setCargandoPagos(true);
    fetchPagos(rango.desde, rango.hasta)
      .then((d) => !cancelado && setPagos(d))
      .catch((e) => console.error('Error cargando pagos:', e))
      .finally(() => !cancelado && setCargandoPagos(false));
    return () => {
      cancelado = true;
    };
  }, [isAuthenticated, activeTab, rango]);

  const elegirPeriodo = (nuevo: Periodo) => {
    setPeriodo(nuevo);
    setRango(rangoDe(nuevo));
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    cargarPedidos();
    fetchAjustes().then(setAjustes).catch((e) => console.error('Error leyendo ajustes:', e));
  }, [isAuthenticated, cargarPedidos]);

  // Los productos viven en MySQL: se piden a /api/products
  const cargarProductos = useCallback(async () => {
    setCargandoProductos(true);
    setErrorProductos(null);
    try {
      setProducts(await fetchProducts({ limit: 100 }));
    } catch (e) {
      console.error('Error cargando el catalogo:', e);
      setErrorProductos('No se pudo cargar el catálogo desde la base de datos.');
    } finally {
      setCargandoProductos(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) cargarProductos();
  }, [isAuthenticated, cargarProductos]);

  // LOGIN DE ACCESO
  // La sesion vive en una cookie firmada, no en el estado de React. Al cargar
  // la pagina se le pregunta al servidor quien esta adentro.
  useEffect(() => {
    fetchSesion()
      .then(setSesion)
      .catch(() => setSesion({ usuario: null, necesitaSetup: false }));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entrando) return;
    setEntrando(true);
    setLoginError('');
    try {
      const esSetup = sesion?.necesitaSetup === true;
      const u = esSetup
        ? await crearPrimerUsuario({
            nombre: credentials.nombre,
            usuario: credentials.usuario,
            email: credentials.email,
            password: credentials.password,
            rol: 'OWNER',
          })
        : await iniciarSesion(credentials.identificador, credentials.password);
      setSesion({ usuario: u, necesitaSetup: false });
      setCredentials({ identificador: '', password: '', nombre: '', usuario: '', email: '' });
    } catch (error) {
      setLoginError((error as Error).message);
      // El estado pudo cambiar desde que se abrió la pantalla: si ya hay
      // usuarios, el formulario pasa solo de 'crear cuenta' a 'iniciar sesión'
      // en vez de dejar al usuario atascado.
      fetchSesion()
        .then((actual) => setSesion((prev) => ({ ...actual, usuario: prev?.usuario ?? actual.usuario })))
        .catch(() => {});
    } finally {
      setEntrando(false);
    }
  };

  // Si el perfil no alcanza para la pestaña abierta, se devuelve a pedidos
  useEffect(() => {
    if (!usuario) return;
    const requiere: Record<string, Parameters<typeof puede>[1]> = {
      products: 'catalogo',
      analytics: 'ventas',
      settings: 'ajustes',
      usuarios: 'usuarios',
    };
    const p = requiere[activeTab];
    if (p && !puede(usuario.rol, p)) setActiveTab('orders');
  }, [usuario, activeTab]);

  const handleLogout = async () => {
    try {
      await cerrarSesion();
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
    setSesion({ usuario: null, necesitaSetup: false });
  };

  // --- GESTIÓN DE USUARIOS (solo owner) ---
  const cargarUsuarios = useCallback(async () => {
    try {
      setUsuarios(await fetchUsuarios());
    } catch (e) {
      console.error('Error cargando usuarios:', e);
    }
  }, []);

  const handleGuardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardandoUsuario) return;
    setGuardandoUsuario(true);
    setErrorUsuario(null);
    try {
      if (usuarioForm.id) {
        // Sin contraseña nueva, se conserva la que tenía
        const { id, password, ...resto } = usuarioForm;
        await actualizarUsuario(id, password ? { ...resto, password } : resto);
      } else {
        await crearUsuario(usuarioForm);
      }
      setUsuarioForm({ nombre: '', usuario: '', email: '', password: '', rol: 'ASESOR', activo: true });
      await cargarUsuarios();
    } catch (error) {
      setErrorUsuario((error as Error).message);
    } finally {
      setGuardandoUsuario(false);
    }
  };

  // Genera el enlace de recuperación y lo deja listo para enviar
  const handleEnlaceClave = async (u: Usuario, porWhatsapp: boolean) => {
    try {
      const { token, horas } = await generarEnlaceClave(u.id);
      const enlace = `${window.location.origin}/clave/${token}`;

      if (porWhatsapp) {
        const texto = encodeURIComponent(
          `Hola ${u.nombre}, usa este enlace para poner tu contraseña de OCEANPARK. Vence en ${horas} horas: ${enlace}`
        );
        window.open(`https://wa.me/?text=${texto}`, '_blank');
      } else {
        await navigator.clipboard.writeText(enlace);
        alert(`Enlace copiado. Vence en ${horas} horas y sirve una sola vez.`);
      }
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleCambiarMiClave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMiClave(null);
    try {
      await cambiarMiPassword(miClave.actual, miClave.nueva);
      setMiClave({ actual: '', nueva: '', abierto: false });
      alert('Tu contraseña quedó actualizada.');
    } catch (error) {
      setErrorMiClave((error as Error).message);
    }
  };

  const handleEliminarUsuario = async (u: Usuario) => {
    if (!confirm(`¿Eliminar el acceso de ${u.nombre}?`)) return;
    try {
      await eliminarUsuario(u.id);
      await cargarUsuarios();
    } catch (error) {
      alert((error as Error).message);
    }
  };

  // --- ELIMINAR PEDIDO (solo owner) ---
  const handleEliminarPedido = async (id: number, numero: string) => {
    if (!confirm(`¿Eliminar el pedido ${numero}? Esta acción no se puede deshacer.`)) return;
    try {
      await eliminarPedido(id);
      setSelectedOrder(null);
      await Promise.all([cargarPedidos(), cargarProductos()]);
    } catch (error) {
      alert((error as Error).message);
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
        price: product.price.toString(),
        description: product.description || '',
        presentations: product.presentations.length
          ? product.presentations.map((p) => ({ ...p }))
          : presentacionesPorDefecto(product.category),
        image: product.image,
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
        price: '',
        description: '',
        presentations: presentacionesPorDefecto('PERFUMERIA'),
        image: '',
        isNewRelease: false,
      });
    }
    setErrorForm(null);
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
      presentations: editingProduct ? prev.presentations : presentacionesPorDefecto(newCat),
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

  // La foto se sube al servidor y en el formulario queda solo su ruta.
  // Antes se guardaba el archivo entero en base64 dentro del navegador.
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoImagen(true);
    setErrorForm(null);
    try {
      const url = await uploadProductImage(file);
      setProductForm((prev) => ({ ...prev, image: url }));
    } catch (error) {
      setErrorForm((error as Error).message);
    } finally {
      setSubiendoImagen(false);
      e.target.value = '';
    }
  };

  // --- EDICION DE PRESENTACIONES (cada una con su propio stock) ---
  const cambiarPresentacion = (indice: number, campo: keyof Presentacion, valor: string) => {
    setProductForm((prev) => ({
      ...prev,
      presentations: prev.presentations.map((p, i) =>
        i === indice
          ? { ...p, [campo]: campo === 'stock' ? Math.max(0, Math.trunc(Number(valor) || 0)) : valor }
          : p
      ),
    }));
  };

  const agregarPresentacion = () => {
    setProductForm((prev) => ({
      ...prev,
      presentations: [...prev.presentations, { nombre: '', stock: 0 }],
    }));
  };

  const quitarPresentacion = (indice: number) => {
    setProductForm((prev) => ({
      ...prev,
      presentations: prev.presentations.filter((_, i) => i !== indice),
    }));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;

    // Si el select quedó vacío o con un valor inválido, recalculamos el href desde el menú
    const subs = getSubcategoriesForCategory(productForm.category);
    const matchedSub = subs.find((s) => s.label === productForm.subcategoryName);
    const finalHref = matchedSub?.href || productForm.subcategoryHref;

    const entrada = {
      subcategoryHref: finalHref,
      name: productForm.name,
      description: productForm.description,
      price: Number(productForm.price),
      image: productForm.image,
      isNewRelease: productForm.isNewRelease === true,
      presentations: productForm.presentations.filter((p) => p.nombre.trim().length > 0),
    };

    setGuardando(true);
    setErrorForm(null);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, entrada);
      } else {
        await createProduct(entrada);
      }
      await cargarProductos();
      setIsProductModalOpen(false);
    } catch (error) {
      setErrorForm((error as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('¿Deseas retirar este producto del catálogo?')) return;
    try {
      await deleteProduct(id);
      await cargarProductos();
    } catch (error) {
      alert((error as Error).message);
    }
  };

  // CAMBIAR ESTADO DE UNA ORDEN
  // El servidor valida la transicion; aqui solo ofrecemos las permitidas.
  const handleStatusChange = async (orderId: number, newStatus: EstadoOrden) => {
    if (moviendoEstado) return;
    setMoviendoEstado(true);
    try {
      const actualizado = await cambiarEstadoPedido(orderId, newStatus, undefined, refPago || undefined);
      setRefPago('');
      setOrders((prev) => prev.map((o) => (o.id === orderId ? actualizado : o)));
      setSelectedOrder((prev) => (prev && prev.id === orderId ? actualizado : prev));
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setMoviendoEstado(false);
    }
  };

  const enlaceResena = (pedido: Pedido) =>
    pedido.tokenResena ? `${window.location.origin}/resena/${pedido.tokenResena}` : '';

  const handleGuardarAjustes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ajustes || guardandoAjustes) return;
    setGuardandoAjustes(true);
    try {
      setAjustes(await guardarAjustes(ajustes));
      alert('Datos de pago actualizados.');
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setGuardandoAjustes(false);
    }
  };

  const handleSubirQr = async (e: React.ChangeEvent<HTMLInputElement>, campo: 'nequiQr' | 'daviplataQr') => {
    const file = e.target.files?.[0];
    if (!file || !ajustes) return;
    try {
      const url = await uploadProductImage(file);
      setAjustes({ ...ajustes, [campo]: url });
    } catch (error) {
      alert((error as Error).message);
    } finally {
      e.target.value = '';
    }
  };

  // REGISTRAR VENTA MANUAL POR CHAT (WHATSAPP / REDES)
  const handleRegisterManualSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProduct = products.find((p) => String(p.id) === manualSaleForm.productId);
    if (!targetProduct) {
      alert('Selecciona un producto válido');
      return;
    }

    // El stock vive por presentacion, asi que se descuenta de la elegida
    const presentacion = targetProduct.presentations.find(
      (pres) => pres.nombre === manualSaleForm.size
    );
    if (!presentacion) {
      alert('Selecciona una presentación válida');
      return;
    }

    const qty = Number(manualSaleForm.quantity);
    if (presentacion.stock < qty) {
      alert(`Stock insuficiente. Quedan ${presentacion.stock} unidades de ${presentacion.nombre}.`);
      return;
    }

    // Se crea como cualquier otro pedido: la API calcula el total y descuenta
    // el inventario en la misma transaccion.
    try {
      await crearPedido({
        nombre: manualSaleForm.customerName || 'Cliente Chat',
        apellido: '',
        ciudad: manualSaleForm.customerCity || 'No especificada',
        direccionEnvio: manualSaleForm.customerAddress || 'No especificada',
        telefono: manualSaleForm.customerPhone || 'N/A',
        metodoPago: manualSaleForm.paymentMethod,
        canal: manualSaleForm.channel,
        costoEnvio: Number(manualSaleForm.shippingFee) || 0,
        items: [{ idProducto: targetProduct.id, presentacion: presentacion.nombre, cantidad: qty }],
      });
      await Promise.all([cargarProductos(), cargarPedidos()]);
    } catch (error) {
      alert((error as Error).message);
      return;
    }

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
      paymentMethod: 'NEQUI' as MetodoPago,
    });

    alert('Venta registrada con éxito y stock actualizado.');
  };

  // Presentaciones del producto elegido en la venta manual
  const presentacionesDelProductoElegido =
    products.find((p) => String(p.id) === manualSaleForm.productId)?.presentations ?? [];

  // Un pedido entregado o cancelado sale de las bandejas de trabajo:
  // ya no hay nada que hacerle, solo queda como historial.
  const pedidosDeBandeja = orders.filter((o) => BANDEJAS[bandeja].estados.includes(o.estado));
  const filteredOrders = pedidosDeBandeja.filter(
    (order) => filterStatus === 'TODOS' || order.estado === filterStatus
  );


  // Mientras no sepamos si hay sesión no se muestra ni el login ni el panel:
  // así no parpadea la pantalla de acceso al recargar estando dentro.
  if (sesion === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-sans">
        <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const esSetup = sesion.necesitaSetup;
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
            <h1 className="text-xl font-black text-neutral-900 tracking-tight uppercase">
              {esSetup ? 'Crea tu cuenta' : 'Acceso Restringido'}
            </h1>
            <p className="text-xs text-neutral-500 font-medium mt-1">
              {esSetup
                ? 'Esta tienda aún no tiene usuarios. El primero queda como owner.'
                : 'Panel de Administración de Tienda'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-center font-bold tracking-wide">
                ⚠️ {loginError}
              </div>
            )}

            {esSetup ? (
              <>
                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">Tu nombre</label>
                  <input
                    type="text"
                    required
                    value={credentials.nombre}
                    onChange={(e) => setCredentials({ ...credentials, nombre: e.target.value })}
                    placeholder="Ej. Stiven Caro"
                    className="w-full bg-white border border-neutral-300 text-neutral-900 text-sm rounded-xl p-3 outline-none focus:border-black font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">Usuario</label>
                  <input
                    type="text"
                    required
                    value={credentials.usuario}
                    onChange={(e) => setCredentials({ ...credentials, usuario: e.target.value })}
                    placeholder="Ej. stiven"
                    className="w-full bg-white border border-neutral-300 text-neutral-900 text-sm rounded-xl p-3 outline-none focus:border-black font-semibold"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1.5">Con esto entras al panel.</p>
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">Correo</label>
                  <input
                    type="email"
                    required
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    placeholder="tucorreo@oceanpark.com"
                    className="w-full bg-white border border-neutral-300 text-neutral-900 text-sm rounded-xl p-3 outline-none focus:border-black font-semibold"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1.5">
                    Solo para recuperar la contraseña si se te olvida.
                  </p>
                </div>
              </>
            ) : (
              <div>
                <label className="block font-bold text-neutral-800 uppercase mb-1">Usuario</label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={credentials.identificador}
                  onChange={(e) => setCredentials({ ...credentials, identificador: e.target.value })}
                  placeholder="Tu usuario o tu correo"
                  className="w-full bg-white border border-neutral-300 text-neutral-900 text-sm rounded-xl p-3 outline-none focus:border-black font-semibold"
                />
              </div>
            )}

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
              {esSetup && (
                <p className="text-[10px] text-neutral-400 mt-1.5">Mínimo 8 caracteres.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={entrando}
              className="w-full bg-black text-white font-bold py-3.5 rounded-xl uppercase tracking-wider hover:bg-neutral-800 transition-all shadow-lg text-xs mt-2 disabled:bg-neutral-300"
            >
              {entrando ? 'Un momento...' : esSetup ? 'Crear cuenta y entrar' : 'Entrar al Panel'}
            </button>

            {!esSetup && (
              <p className="text-[10px] text-neutral-400 text-center leading-relaxed pt-1">
                ¿Olvidaste tu contraseña? Pídele al dueño de la tienda que te genere un
                enlace desde el panel.
              </p>
            )}
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
          {permiso('catalogo') && (
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'products' ? 'bg-white text-black shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            💄 Catálogo ({products.length})
          </button>
          )}
          {permiso('ventas') && (
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'analytics' ? 'bg-white text-black shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            📊 Ventas & Flujo
          </button>
          )}
          {permiso('ajustes') && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'settings' ? 'bg-white text-black shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            ⚙️ Datos de Pago
          </button>
          )}
          {permiso('usuarios') && (
          <button
            onClick={() => {
              setActiveTab('usuarios');
              cargarUsuarios();
            }}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'usuarios' ? 'bg-white text-black shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            👤 Usuarios
          </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsManualSaleOpen(true)}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            💬 + Venta Chat
          </button>
          <div className="text-right hidden sm:block">
            <span className="block text-xs font-bold text-white leading-tight">{usuario?.nombre}</span>
            <span className="block text-[10px] text-neutral-400 uppercase tracking-wider">
              {usuario ? ROLES[usuario.rol].label : ''}
            </span>
          </div>
          <button
            onClick={handleLogout}
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

              <div className="flex gap-2 text-xs font-semibold w-full sm:w-auto">
                {(Object.keys(BANDEJAS) as Bandeja[]).map((b) => {
                  const cuantos = orders.filter((o) => BANDEJAS[b].estados.includes(o.estado)).length;
                  return (
                    <button
                      key={b}
                      onClick={() => {
                        setBandeja(b);
                        setFilterStatus('TODOS');
                      }}
                      className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                        bandeja === b
                          ? 'bg-black text-white font-bold shadow'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      <span>{BANDEJAS[b].icono}</span>
                      {BANDEJAS[b].label}
                      <span
                        className={`px-1.5 rounded-full text-[10px] ${
                          bandeja === b ? 'bg-white/20' : 'bg-white'
                        }`}
                      >
                        {cuantos}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-[11px] text-neutral-500 mb-2">
                {bandeja === 'pagos'
                  ? 'Aquí solo se valida el dinero. Cuando confirmes el pago, el pedido pasa a Logística.'
                  : bandeja === 'logistica'
                    ? 'Alistamiento y despacho. Al marcar Entregado el pedido sale de esta bandeja.'
                    : 'Pedidos cerrados. Solo quedan como historial.'}
              </p>
              <div className="flex gap-2 text-xs font-semibold overflow-x-auto pb-1">
                {(['TODOS', ...BANDEJAS[bandeja].estados] as const).map((estado) => {
                  const cuantos =
                    estado === 'TODOS'
                      ? pedidosDeBandeja.length
                      : pedidosDeBandeja.filter((o) => o.estado === estado).length;
                  return (
                    <button
                      key={estado}
                      onClick={() => setFilterStatus(estado)}
                      className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                        filterStatus === estado
                          ? 'bg-neutral-900 text-white font-bold'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {estado === 'TODOS' ? 'Todos' : ESTADOS[estado].label} ({cuantos})
                    </button>
                  );
                })}
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
                          {cargandoPedidos
                            ? 'Cargando pedidos...'
                            : errorPedidos
                              ? errorPedidos
                              : `No hay pedidos en ${BANDEJAS[bandeja].label}.`}
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="p-4 font-bold text-neutral-900">{order.numero}</td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                order.canal === 'WhatsApp'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.canal === 'Facebook'
                                  ? 'bg-blue-100 text-blue-800'
                                  : order.canal === 'Instagram'
                                  ? 'bg-pink-100 text-pink-800'
                                  : 'bg-neutral-200 text-neutral-800'
                              }`}
                            >
                              {order.canal}
                            </span>
                          </td>
                          <td className="p-4 text-neutral-500">
                            {new Date(order.fecha).toLocaleDateString('es-CO')}
                          </td>
                          <td className="p-4 font-semibold">
                            {order.nombre} {order.apellido}
                            <span className="block text-[10px] text-neutral-400 font-medium">
                              {METODOS_PAGO[order.metodoPago].label}
                            </span>
                          </td>
                          <td className="p-4 text-neutral-600">{order.ciudad}</td>
                          <td className="p-4 font-bold text-neutral-900">{formatCOP(order.total)}</td>
                          <td className="p-4">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase ${ESTADOS[order.estado].color}`}
                            >
                              {ESTADOS[order.estado].label}
                            </span>
                            <span className="block text-[9px] text-neutral-400 font-bold uppercase tracking-wider mt-1">
                              {ESTADOS[order.estado].etapa}
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
                          {cargandoProductos
                            ? 'Cargando catálogo desde la base de datos...'
                            : errorProductos
                              ? errorProductos
                              : 'No hay productos registrados en el catálogo.'}
                        </td>
                      </tr>
                    ) : (
                      products.map((prod) => (
                        <tr key={prod.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="p-4">
                            {/* Sin foto no se pinta un <img> vacio: el navegador
                                interpreta src="" como recargar la pagina entera. */}
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="h-12 w-12 object-contain rounded-lg border border-neutral-200 bg-white p-1"
                              />
                            ) : (
                              <div
                                title="Este producto no tiene foto"
                                className="h-12 w-12 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center text-neutral-300 text-lg"
                              >
                                🖼
                              </div>
                            )}
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
                            <div className="mt-1">
                              <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">
                                {prod.subcategory.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 font-bold text-neutral-900">{formatCOP(prod.price)}</td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {prod.presentations.map((pres) => (
                                <span
                                  key={pres.nombre}
                                  title={`${pres.stock} en inventario`}
                                  className={`inline-block border px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    pres.stock > 0
                                      ? 'bg-neutral-100 border-neutral-200 text-neutral-700'
                                      : 'bg-red-50 border-red-200 text-red-600'
                                  }`}
                                >
                                  {pres.nombre} · {pres.stock}
                                </span>
                              ))}
                            </div>
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

            {/* Rango de fechas: atajos por periodo o fechas a mano */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 space-y-4">
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                {(Object.keys(PERIODOS) as Periodo[]).map((pr) => (
                  <button
                    key={pr}
                    onClick={() => elegirPeriodo(pr)}
                    className={`px-4 py-2 rounded-xl transition-colors ${
                      periodo === pr
                        ? 'bg-black text-white font-bold shadow'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {PERIODOS[pr]}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-end gap-3 text-xs border-t border-neutral-100 pt-4">
                <div>
                  <label className="block font-bold text-neutral-500 uppercase mb-1 text-[10px]">Desde</label>
                  <input
                    type="date"
                    value={rango.desde}
                    onChange={(e) => setRango({ ...rango, desde: e.target.value })}
                    className="border border-neutral-300 rounded-lg p-2 outline-none focus:border-black font-semibold text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-500 uppercase mb-1 text-[10px]">Hasta</label>
                  <input
                    type="date"
                    value={rango.hasta}
                    onChange={(e) => setRango({ ...rango, hasta: e.target.value })}
                    className="border border-neutral-300 rounded-lg p-2 outline-none focus:border-black font-semibold text-neutral-900"
                  />
                </div>
                <span className="text-[11px] text-neutral-400 pb-2">
                  {cargandoPagos ? 'Consultando...' : `${pagos.length} pago(s) en el rango`}
                </span>
              </div>
            </div>

            {/* Resumen del rango */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Vendido</p>
                <p className="text-2xl font-black text-neutral-900 mt-1">
                  {formatCOP(pagos.reduce((a, pg) => a + pg.monto, 0))}
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Pagos recibidos</p>
                <p className="text-2xl font-black text-neutral-900 mt-1">{pagos.length}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Ticket promedio</p>
                <p className="text-2xl font-black text-neutral-900 mt-1">
                  {formatCOP(pagos.length ? pagos.reduce((a, pg) => a + pg.monto, 0) / pagos.length : 0)}
                </p>
              </div>
            </div>

            {/* Cuánto entró por cada medio */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4">
                Por medio de pago
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(Object.keys(METODOS_PAGO) as MetodoPago[]).map((m) => {
                  const delMetodo = pagos.filter((pg) => pg.metodo === m);
                  const suma = delMetodo.reduce((a, pg) => a + pg.monto, 0);
                  return (
                    <div key={m} className="border border-neutral-200 rounded-xl p-4">
                      <p className="text-[11px] font-bold text-neutral-500 uppercase">
                        {METODOS_PAGO[m].label}
                      </p>
                      <p className="text-lg font-black text-neutral-900 mt-0.5">{formatCOP(suma)}</p>
                      <p className="text-[11px] text-neutral-400">{delMetodo.length} pago(s)</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Registro de pagos */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-neutral-200">
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                  Registro de pagos
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Cada pago queda registrado cuando el dinero entra: al confirmar una transferencia,
                  o al entregar si es contraentrega.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-100 text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-200">
                      <th className="p-4">Fecha</th>
                      <th className="p-4">N° Orden</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Medio</th>
                      <th className="p-4">Referencia</th>
                      <th className="p-4 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-medium">
                    {pagos.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-neutral-400">
                          {cargandoPagos
                            ? 'Consultando pagos...'
                            : 'No hay pagos registrados en este rango de fechas.'}
                        </td>
                      </tr>
                    ) : (
                      pagos.map((pg) => (
                        <tr key={pg.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="p-4 text-neutral-500">
                            {new Date(pg.fechaHora).toLocaleString('es-CO')}
                          </td>
                          <td className="p-4 font-bold text-neutral-900">{pg.numeroOrden}</td>
                          <td className="p-4">{pg.cliente}</td>
                          <td className="p-4">
                            <span className="bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-[10px] font-bold">
                              {METODOS_PAGO[pg.metodo].label}
                            </span>
                          </td>
                          <td className="p-4 text-neutral-500">{pg.referencia || '—'}</td>
                          <td className="p-4 text-right font-bold text-neutral-900">
                            {formatCOP(pg.monto)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {pagos.length > 0 && (
                    <tfoot>
                      <tr className="bg-neutral-50 border-t-2 border-neutral-200">
                        <td colSpan={5} className="p-4 font-bold text-neutral-700 uppercase text-right">
                          Total del rango
                        </td>
                        <td className="p-4 text-right font-black text-neutral-900">
                          {formatCOP(pagos.reduce((a, pg) => a + pg.monto, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}
        {/* TAB 4: DATOS DE PAGO */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-neutral-900">Datos de Pago</h2>
              <p className="text-xs text-neutral-500">
                Esto es lo que ve el cliente al confirmar un pedido con pago anticipado.
              </p>
            </div>

            {!ajustes ? (
              <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center text-xs text-neutral-400">
                Cargando...
              </div>
            ) : (
              <form onSubmit={handleGuardarAjustes} className="space-y-4 text-xs">
                {(['NEQUI', 'DAVIPLATA'] as const).map((metodo) => {
                  const campoNumero = metodo === 'NEQUI' ? 'nequiNumero' : 'daviplataNumero';
                  const campoQr = metodo === 'NEQUI' ? 'nequiQr' : 'daviplataQr';
                  return (
                    <div key={metodo} className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
                      <h3 className="font-bold text-neutral-900 uppercase">
                        {METODOS_PAGO[metodo].label}
                      </h3>

                      <div>
                        <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                          Número de celular
                        </label>
                        <input
                          type="tel"
                          value={ajustes[campoNumero]}
                          onChange={(e) => setAjustes({ ...ajustes, [campoNumero]: e.target.value })}
                          placeholder="3001234567"
                          className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4 items-start">
                        <div>
                          <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                            Código QR
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSubirQr(e, campoQr)}
                            className="w-full text-[11px] text-neutral-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-neutral-900 file:text-white hover:file:bg-black cursor-pointer"
                          />
                          <p className="text-[10px] text-neutral-400 mt-1.5 leading-relaxed">
                            Sácalo desde la app de {METODOS_PAGO[metodo].label}, en la opción de recibir pagos.
                          </p>
                        </div>
                        <div className="flex items-center justify-center border border-dashed border-neutral-300 rounded-xl p-2 bg-neutral-50 min-h-[110px]">
                          {ajustes[campoQr] ? (
                            <img src={ajustes[campoQr]} alt="QR" className="h-24 w-24 object-contain" />
                          ) : (
                            <span className="text-neutral-400 text-[11px]">Sin QR</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="bg-white rounded-xl border border-neutral-200 p-5">
                  <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                    WhatsApp de la tienda
                  </label>
                  <input
                    type="tel"
                    value={ajustes.whatsappNumero}
                    onChange={(e) => setAjustes({ ...ajustes, whatsappNumero: e.target.value })}
                    placeholder="573001234567"
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1.5">
                    Con indicativo del país y sin signos. Para Colombia: 57 + el número.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={guardandoAjustes}
                  className="bg-black hover:bg-neutral-800 text-white font-bold py-3 px-8 rounded-xl uppercase tracking-wider transition-all disabled:bg-neutral-300"
                >
                  {guardandoAjustes ? 'Guardando...' : 'Guardar'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 5: USUARIOS (solo owner) */}
        {activeTab === 'usuarios' && permiso('usuarios') && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Usuarios del panel</h2>
              <p className="text-xs text-neutral-500">
                Cada persona entra con su propio correo. El perfil define qué puede hacer.
              </p>
            </div>

            {/* Qué puede cada perfil */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.keys(ROLES) as Rol[]).map((r) => (
                <div key={r} className="bg-white border border-neutral-200 rounded-xl p-4">
                  <p className="font-bold text-neutral-900 uppercase text-xs">{ROLES[r].label}</p>
                  <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">{ROLES[r].descripcion}</p>
                </div>
              ))}
            </div>

            {/* Alta y edición */}
            <form onSubmit={handleGuardarUsuario} className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4 text-xs">
              <h3 className="font-bold text-neutral-900 uppercase">
                {usuarioForm.id ? `Editar a ${usuarioForm.nombre}` : 'Crear usuario'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">Nombre</label>
                  <input
                    type="text"
                    required
                    value={usuarioForm.nombre}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, nombre: e.target.value })}
                    placeholder="Ej. Laura Pérez"
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">Usuario</label>
                  <input
                    type="text"
                    required
                    value={usuarioForm.usuario}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, usuario: e.target.value })}
                    placeholder="laura"
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Con esto inicia sesión.</p>
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">Correo</label>
                  <input
                    type="email"
                    required
                    value={usuarioForm.email}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, email: e.target.value })}
                    placeholder="laura@oceanpark.com"
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">Perfil</label>
                  <select
                    value={usuarioForm.rol}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, rol: e.target.value as Rol })}
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                  >
                    {(Object.keys(ROLES) as Rol[]).map((r) => (
                      <option key={r} value={r}>{ROLES[r].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                    Contraseña {usuarioForm.id && <span className="text-neutral-400">(déjala vacía para no cambiarla)</span>}
                  </label>
                  <input
                    type="password"
                    required={!usuarioForm.id}
                    minLength={8}
                    value={usuarioForm.password ?? ''}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                  />
                </div>
              </div>

              {errorUsuario && (
                <p className="bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold rounded-xl p-3">
                  {errorUsuario}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={guardandoUsuario}
                  className="bg-black hover:bg-neutral-800 text-white font-bold py-3 px-8 rounded-xl uppercase tracking-wider transition-all disabled:bg-neutral-300"
                >
                  {guardandoUsuario ? 'Guardando...' : usuarioForm.id ? 'Guardar cambios' : 'Crear usuario'}
                </button>
                {usuarioForm.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setUsuarioForm({ nombre: '', usuario: '', email: '', password: '', rol: 'ASESOR', activo: true });
                      setErrorUsuario(null);
                    }}
                    className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold py-3 px-6 rounded-xl uppercase tracking-wider transition-all"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            {/* Mi propia contraseña */}
            <div className="bg-white rounded-xl border border-neutral-200 p-5 text-xs">
              {!miClave.abierto ? (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-neutral-900 uppercase">Tu contraseña</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Cámbiala cuando quieras. Nadie puede verla, ni siquiera desde la base de datos.
                    </p>
                  </div>
                  <button
                    onClick={() => setMiClave({ ...miClave, abierto: true })}
                    className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold px-4 py-2 rounded-lg transition-colors"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCambiarMiClave} className="space-y-3">
                  <p className="font-bold text-neutral-900 uppercase">Cambiar tu contraseña</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">Actual</label>
                      <input
                        type="password"
                        required
                        value={miClave.actual}
                        onChange={(e) => setMiClave({ ...miClave, actual: e.target.value })}
                        className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">Nueva</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={miClave.nueva}
                        onChange={(e) => setMiClave({ ...miClave, nueva: e.target.value })}
                        placeholder="Mínimo 8 caracteres"
                        className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                      />
                    </div>
                  </div>
                  {errorMiClave && (
                    <p className="bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold rounded-xl p-3">
                      {errorMiClave}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="bg-black hover:bg-neutral-800 text-white font-bold py-2.5 px-6 rounded-xl uppercase tracking-wider transition-all"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMiClave({ actual: '', nueva: '', abierto: false });
                        setErrorMiClave(null);
                      }}
                      className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold py-2.5 px-5 rounded-xl uppercase tracking-wider transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Listado */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-100 text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-200">
                      <th className="p-4">Nombre</th>
                      <th className="p-4">Usuario</th>
                      <th className="p-4">Correo</th>
                      <th className="p-4">Perfil</th>
                      <th className="p-4">Último acceso</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-medium">
                    {usuarios.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-neutral-400">
                          Cargando usuarios...
                        </td>
                      </tr>
                    ) : (
                      usuarios.map((u) => (
                        <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="p-4 font-bold text-neutral-900">
                            {u.nombre}
                            {u.id === usuario?.id && (
                              <span className="ml-2 text-[10px] bg-neutral-200 px-1.5 py-0.5 rounded font-bold">
                                TÚ
                              </span>
                            )}
                            {!u.activo && (
                              <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                                INACTIVO
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-semibold text-neutral-700">{u.usuario}</td>
                          <td className="p-4 text-neutral-600">{u.email}</td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                u.rol === 'OWNER'
                                  ? 'bg-amber-100 text-amber-800'
                                  : u.rol === 'ADMINISTRADOR'
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-neutral-200 text-neutral-700'
                              }`}
                            >
                              {ROLES[u.rol].label}
                            </span>
                          </td>
                          <td className="p-4 text-neutral-500">
                            {u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString('es-CO') : 'Nunca'}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => {
                                  setUsuarioForm({
                                    id: u.id, nombre: u.nombre, usuario: u.usuario, email: u.email,
                                    password: '', rol: u.rol, activo: u.activo,
                                  });
                                  setErrorUsuario(null);
                                }}
                                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => handleEnlaceClave(u, false)}
                                title="Copiar enlace para que ponga una contraseña nueva"
                                className="bg-amber-50 hover:bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors"
                              >
                                🔑 Enlace
                              </button>
                              <button
                                onClick={() => handleEnlaceClave(u, true)}
                                title="Enviar el enlace por WhatsApp"
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors"
                              >
                                💬
                              </button>
                              {u.id !== usuario?.id && (
                                <button
                                  onClick={() => handleEliminarUsuario(u)}
                                  className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors"
                                >
                                  🗑️
                                </button>
                              )}
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

              <div>
                <label className="block font-bold text-neutral-800 uppercase mb-1">Precio (COP)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder="120000"
                  className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-sm text-neutral-900"
                />
              </div>

              {/* Cada presentación lleva su propio inventario: un 50ml y un 100ml
                  no se venden al mismo ritmo ni se agotan juntos. */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="block font-bold text-neutral-900 uppercase">Presentaciones y stock</span>
                    <span className="text-[11px] text-neutral-500">Ej. 50ml, 100ml, 200g, Único</span>
                  </div>
                  <button
                    type="button"
                    onClick={agregarPresentacion}
                    className="bg-neutral-900 hover:bg-black text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    + Agregar
                  </button>
                </div>

                {productForm.presentations.map((pres, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      required
                      maxLength={40}
                      value={pres.nombre}
                      onChange={(e) => cambiarPresentacion(i, 'nombre', e.target.value)}
                      placeholder="50ml"
                      className="flex-1 bg-white border border-neutral-300 rounded-lg p-2.5 outline-none focus:border-black font-semibold text-neutral-900"
                    />
                    <input
                      type="number"
                      required
                      min="0"
                      value={pres.stock}
                      onChange={(e) => cambiarPresentacion(i, 'stock', e.target.value)}
                      placeholder="0"
                      title="Unidades en inventario"
                      className="w-24 bg-white border border-neutral-300 rounded-lg p-2.5 outline-none focus:border-black font-semibold text-neutral-900"
                    />
                    <button
                      type="button"
                      onClick={() => quitarPresentacion(i)}
                      disabled={productForm.presentations.length === 1}
                      title="Quitar presentación"
                      className="text-red-500 hover:text-red-700 font-bold px-2 disabled:text-neutral-300 disabled:cursor-not-allowed"
                    >
                      ✕
                    </button>
                  </div>
                ))}
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
                    disabled={subiendoImagen}
                    onChange={handleImageUpload}
                    className="w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-neutral-900 file:text-white hover:file:bg-black cursor-pointer mb-2 disabled:opacity-50"
                  />
                  {subiendoImagen && (
                    <p className="text-[11px] text-neutral-500 mb-2">Subiendo imagen...</p>
                  )}
                  <input
                    type="text"
                    value={productForm.image}
                    onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                    placeholder="/uploads/foto.webp o https://..."
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

              {errorForm && (
                <p className="bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold rounded-xl p-3">
                  {errorForm}
                </p>
              )}

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
                  disabled={guardando || subiendoImagen}
                  className="w-1/2 bg-black hover:bg-neutral-800 text-white font-bold py-3 rounded-xl uppercase tracking-wider transition-all shadow-lg disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  {guardando ? 'Guardando...' : editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
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
                  onChange={(e) => setManualSaleForm({ ...manualSaleForm, productId: e.target.value, size: '' })}
                  className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                >
                  <option value="">-- Elige un producto --</option>
                  {products.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name} - {formatCOP(p.price)} (Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">Presentación</label>
                  <select
                    value={manualSaleForm.size}
                    onChange={(e) => setManualSaleForm({ ...manualSaleForm, size: e.target.value })}
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                  >
                    <option value="">-- Elige --</option>
                    {presentacionesDelProductoElegido.map((pres) => (
                      <option key={pres.nombre} value={pres.nombre} disabled={pres.stock <= 0}>
                        {pres.nombre} ({pres.stock} disp.)
                      </option>
                    ))}
                  </select>
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
                <select
                  value={manualSaleForm.paymentMethod}
                  onChange={(e) =>
                    setManualSaleForm({ ...manualSaleForm, paymentMethod: e.target.value as MetodoPago })
                  }
                  className="w-full bg-white border border-neutral-300 rounded-xl p-3 outline-none focus:border-black font-semibold text-neutral-900"
                >
                  {(Object.keys(METODOS_PAGO) as MetodoPago[]).map((m) => (
                    <option key={m} value={m}>
                      {METODOS_PAGO[m].label}
                    </option>
                  ))}
                </select>
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
                <h3 className="font-black text-neutral-900 text-base uppercase">Orden: {selectedOrder.numero}</h3>
                <p className="text-[11px] text-neutral-500">
                  {new Date(selectedOrder.fecha).toLocaleString('es-CO')} · {selectedOrder.canal}
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
                  {selectedOrder.nombre} {selectedOrder.apellido}
                </p>
                <p className="text-neutral-600">Teléfono: {selectedOrder.telefono}</p>
                <p className="text-neutral-600">Ciudad: {selectedOrder.ciudad}</p>
                <p className="text-neutral-600">Dirección: {selectedOrder.direccionEnvio}</p>
                {selectedOrder.notas && (
                  <p className="text-neutral-600">Notas: {selectedOrder.notas}</p>
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
                        <p className="font-bold text-neutral-900">{it.nombreProducto}</p>
                        <p className="text-[11px] text-neutral-500">
                          Presentación: {it.presentacion} | Cantidad: {it.cantidad}
                        </p>
                      </div>
                      <span className="font-bold text-neutral-900">
                        {formatCOP(it.precioUnitario * it.cantidad)}
                      </span>
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
                  <span>{formatCOP(selectedOrder.costoEnvio)}</span>
                </div>
                <div className="flex justify-between font-black text-neutral-900 text-sm pt-2 border-t border-neutral-200">
                  <span>Total:</span>
                  <span>{formatCOP(selectedOrder.total)}</span>
                </div>
                <p className="text-[11px] text-neutral-500 text-left mt-2">
                  Método de pago:{' '}
                  <span className="font-bold text-neutral-800">
                    {METODOS_PAGO[selectedOrder.metodoPago].label}
                  </span>
                </p>
              </div>

              <div className="border-t border-neutral-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-neutral-800 uppercase">Estado del pedido</label>
                  <span
                    className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase ${ESTADOS[selectedOrder.estado].color}`}
                  >
                    {ESTADOS[selectedOrder.estado].label}
                  </span>
                </div>

                {/* Al confirmar una transferencia se puede anotar el número de la
                    transacción, que queda guardado junto al pago. */}
                {selectedOrder.estado === 'PENDIENTE_PAGO' &&
                  selectedOrder.metodoPago !== 'CONTRAENTREGA' && (
                    <div className="mb-3">
                      <label className="block font-bold text-neutral-700 uppercase mb-1 text-[11px]">
                        Referencia del pago (opcional)
                      </label>
                      <input
                        type="text"
                        value={refPago}
                        onChange={(e) => setRefPago(e.target.value)}
                        placeholder="N° de transacción o comprobante"
                        className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 outline-none focus:border-black font-semibold text-neutral-900"
                      />
                    </div>
                  )}

                {ESTADOS[selectedOrder.estado].siguientes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {ESTADOS[selectedOrder.estado].siguientes.map((siguiente) => (
                      <button
                        key={siguiente}
                        onClick={() => handleStatusChange(selectedOrder.id, siguiente)}
                        disabled={moviendoEstado}
                        className={`px-3 py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-colors disabled:opacity-50 ${
                          siguiente === 'CANCELADO'
                            ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                            : 'bg-neutral-900 text-white hover:bg-black'
                        }`}
                      >
                        {siguiente === 'CANCELADO' ? 'Cancelar / Devolución' : `Pasar a ${ESTADOS[siguiente].label}`}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-500">Este pedido ya está cerrado.</p>
                )}

                {/* Al entregar se habilita el enlace de calificación */}
                {selectedOrder.estado === 'ENTREGADO' && selectedOrder.tokenResena && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                    <p className="font-bold text-amber-900 uppercase text-[11px]">Pide la reseña</p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Mándale este enlace al cliente para que califique lo que compró.
                    </p>
                    <div className="flex gap-2 mt-2.5">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(enlaceResena(selectedOrder));
                          alert('Enlace copiado.');
                        }}
                        className="flex-1 bg-white border border-amber-300 text-amber-900 font-bold text-[11px] py-2 rounded-lg hover:bg-amber-100 transition-colors"
                      >
                        Copiar enlace
                      </button>
                      <button
                        onClick={() => {
                          const texto = encodeURIComponent(
                            `¡Hola ${selectedOrder.nombre}! Gracias por tu compra en OCEANPARK. ¿Nos regalas tu opinión? ${enlaceResena(selectedOrder)}`
                          );
                          const tel = (selectedOrder.telefono || '').replace(/\D/g, '');
                          window.open(`https://wa.me/57${tel}?text=${texto}`, '_blank');
                        }}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] py-2 rounded-lg transition-colors"
                      >
                        Enviar por WhatsApp
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Historial: quien movio el pedido y cuando */}
              {selectedOrder.historial.length > 0 && (
                <div className="border-t border-neutral-200 pt-4">
                  <p className="font-bold text-neutral-800 uppercase mb-2">Historial</p>
                  <ol className="space-y-1.5">
                    {selectedOrder.historial.map((h, i) => (
                      <li key={i} className="flex justify-between items-center text-[11px]">
                        <span className="font-semibold text-neutral-700">{ESTADOS[h.estado].label}</span>
                        <span className="text-neutral-400">
                          {new Date(h.fechaHora).toLocaleString('es-CO')}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-neutral-100 flex justify-between items-center gap-3">
              {/* Eliminar un pedido repone inventario y borra su pago: por eso
                  queda reservado al owner. */}
              {permiso('eliminarPedidos') ? (
                <button
                  onClick={() => handleEliminarPedido(selectedOrder.id, selectedOrder.numero)}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-4 py-2.5 rounded-xl uppercase tracking-wider text-[11px] transition-colors"
                >
                  🗑️ Eliminar pedido
                </button>
              ) : (
                <span />
              )}
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