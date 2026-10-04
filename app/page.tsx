'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SearchButton from './components/SearchButton';

interface SubCategory {
  label: string;
  href: string;
}

interface CategoryGroup {
  title: string;
  subcategories: SubCategory[];
}

interface CartItem {
  id: number | string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  size?: string;
}

const menuData: Record<string, CategoryGroup[]> = {
  HOMBRE: [
    {
      title: 'Ropa',
      subcategories: [
        { label: 'Hoodies & Sweaters', href: '/hombre/hoodies' },
        { label: 'Camisetas & Graphic Tees', href: '/hombre/camisetas' },
        { label: 'Pantalones & Joggers', href: '/hombre/pantalones' },
        { label: 'Shorts & Pantalonetas', href: '/hombre/shorts' },
        { label: 'Sets / Conjuntos', href: '/hombre/conjuntos' },
      ],
    },
    {
      title: 'Destacados',
      subcategories: [
        { label: 'Nuevos Lanzamientos', href: '/hombre/lanzamientos' },
        { label: 'Jordan Style Drops', href: '/hombre/jordan' },
      ],
    },
  ],
  MUJER: [
    {
      title: 'Ropa Dama',
      subcategories: [
        { label: 'Tops & Crops', href: '/mujer/tops' },
        { label: 'Hoodies Oversized', href: '/mujer/hoodies' },
        { label: 'Pantalones & Cargo', href: '/mujer/pantalones' },
        { label: 'Sets & Athleisure', href: '/mujer/sets' },
      ],
    },
    {
      title: 'Destacados',
      subcategories: [
        { label: 'Colección FADEAWAY Dama', href: '/mujer/coleccion' },
        { label: 'Ofertas / Sale', href: '/mujer/sale' },
      ],
    },
  ],
  KIDS: [
    {
      title: 'Niños & Niñas',
      subcategories: [
        { label: 'Camisetas & Tops', href: '/kids/camisetas' },
        { label: 'Hoodies & Buzos', href: '/kids/hoodies' },
        { label: 'Pantalones & Joggers', href: '/kids/pantalones' },
      ],
    },
  ],
  ACCESORIOS: [
    {
      title: 'Streetwear Essentials',
      subcategories: [
        { label: 'Gorras & Caps', href: '/accesorios/gorras' },
        { label: 'Bolsos & Crossbody', href: '/accesorios/bolsos' },
        { label: 'Cinturones & Medias', href: '/accesorios/cinturones' },
        { label: 'Joyería & Cadenas', href: '/accesorios/joyeria' },
      ],
    },
  ],
  PERFUMERIA: [
    {
      title: 'Fragancias FADEAWAY',
      subcategories: [
        { label: 'Perfumes Hombre', href: '/perfumeria/hombre' },
        { label: 'Perfumes Mujer', href: '/perfumeria/mujer' },
        { label: 'Fragancias Unisex', href: '/perfumeria/unisex' },
      ],
    },
  ],
};

const heroSlides = [
  {
    id: 1,
    tag: 'FADEAWAY X STREETWEAR',
    title: 'Tokyo & NY Culture',
    description: 'Inspirado en la cultura urbana de Nueva York y Japón. Siluetas oversized y zapatillas icónicas.',
    buttonText: 'EXPLORAR LANZAMIENTO',
    img: 'https://images.unsplash.com/photo-1698867928110-2408e8e2f44a?auto=format&fit=crop&fm=jpg&q=80&w=1600',
  },
  {
    id: 2,
    tag: 'SPRING / SUMMER DROPS',
    title: 'Streetwear Culture',
    description: 'Diseños contemporáneos pensados para el uso diario con materiales de alta densidad.',
    buttonText: 'VER COLECCIÓN',
    img: 'https://images.unsplash.com/photo-1558452919-08ae4aea8e29?auto=format&fit=crop&fm=jpg&q=80&w=1600',
  },
  {
    id: 3,
    tag: 'JORDAN HERITAGE SERIES',
    title: 'Wing It Edition',
    description: 'Tributo a la época dorada del baloncesto de los 90s y la estética retro vintage.',
    buttonText: 'COMPRAR AHORA',
    img: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?auto=format&fit=crop&fm=jpg&q=80&w=1600',
  },
  {
    id: 4,
    tag: 'SNEAKER CULTURE VIBES',
    title: 'Urban Kicks & Style',
    description: 'Encuentra las mejores siluetas y combinaciones para elevar tu outfit diario.',
    buttonText: 'DESCUBRIR MÁS',
    img: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&fm=jpg&q=80&w=1600',
  },
];

const newArrivalsPlaceholders = [
  { id: 1, name: 'Hoodie Oversized Tokyo Drop', category: 'Hombre', price: 165000 },
  { id: 2, name: 'Camiseta Graphic NY Vintage', category: 'Hombre', price: 85000 },
  { id: 3, name: 'Jogger Cargo Street Utility', category: 'Hombre', price: 140000 },
  { id: 4, name: 'Crop Top Fadeaway Dama', category: 'Mujer', price: 65000 },
  { id: 5, name: 'Gorra Snapback Wing It Edition', category: 'Accesorios', price: 75000 },
  { id: 6, name: 'Perfume Fadeaway Night 100ml', category: 'Perfumería', price: 120000 },
  { id: 7, name: 'Crossbody Bag Military Black', category: 'Accesorios', price: 95000 },
  { id: 8, name: 'Set Athleisure Dama Oversized', category: 'Mujer', price: 180000 },
];

const featuredCollections = [
  {
    name: 'Jordan & Sneaker Culture',
    href: '/hombre/jordan',
    image: '',
    tag: 'Ver Lanzamientos',
  },
  {
    name: 'Hoodies & Oversized',
    href: '/hombre/hoodies',
    image: '',
    tag: 'Colección Urbana',
  },
  {
    name: 'Streetwear Accessories',
    href: '/accesorios/bolsos',
    image: '',
    tag: 'Essentials',
  },
  {
    name: 'Caps & Beanies',
    href: '/accesorios/gorras',
    image: '',
    tag: 'Headwear',
  },
  {
    name: 'Colección Dama Athleisure',
    href: '/mujer/sets',
    image: '',
    tag: 'Street Dama',
  },
  {
    name: 'Fragancias & Perfumería',
    href: '/perfumeria/hombre',
    image: '',
    tag: 'FADEAWAY Scents',
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // ESTADO DEL CARRITO Y MODALES
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState('');

  // DATOS DEL CLIENTE Y MÉTODO DE PAGO
  const [paymentMethod, setPaymentMethod] = useState<'nequi' | 'daviplata' | 'contraentrega' | 'tarjeta'>('nequi');
  const [customer, setCustomer] = useState({
    nombre: '',
    apellido: '',
    ciudad: '',
    direccion: '',
    telefono: '',
    notas: '',
  });

  // ESTADOS DEL CHAT
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: '¡Hola! 👋 Bienvenido a FADEAWAY. ¿En qué te podemos asesorar hoy?',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const whatsappNumber = '573000000000';
  const FREESHIPPING_THRESHOLD = 150000;
  const SHIPPING_COST = 12000;

  // FUNCIÓN PARA CARGAR EL CARRITO DESDE LOCALSTORAGE
  const loadCartFromStorage = () => {
    const savedCart = localStorage.getItem('fadeaway_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Error al cargar carrito:", e);
      }
    }
  };

  useEffect(() => {
    loadCartFromStorage();
    const handleStorageChange = () => loadCartFromStorage();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (isCartOpen) {
      loadCartFromStorage();
    }
  }, [isCartOpen]);

  const saveCart = (updatedCart: CartItem[]) => {
    setCart(updatedCart);
    localStorage.setItem('fadeaway_cart', JSON.stringify(updatedCart));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shippingFee = subtotal === 0 ? 0 : subtotal >= FREESHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = subtotal + shippingFee;
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));

  const addToCart = (product: typeof newArrivalsPlaceholders[0]) => {
    const existing = cart.find((item) => item.id === product.id);
    let updatedCart: CartItem[];
    if (existing) {
      updatedCart = cart.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      updatedCart = [...cart, { ...product, quantity: 1 }];
    }
    saveCart(updatedCart);
    setIsCartOpen(true);
  };

  const updateQuantity = (id: number | string, delta: number) => {
    const updatedCart = cart
      .map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as CartItem[];
    saveCart(updatedCart);
  };

  const removeFromCart = (id: number | string) => {
    const updatedCart = cart.filter((item) => item.id !== id);
    saveCart(updatedCart);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCustomer({ ...customer, [e.target.name]: e.target.value });
  };

  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.nombre || !customer.apellido || !customer.ciudad || !customer.direccion || !customer.telefono) {
      alert('Por favor completa todos los campos requeridos.');
      return;
    }

    const orderId = `FW-${Math.floor(100000 + Math.random() * 900000)}`;
    setLastOrderNumber(orderId);

    const newOrder = {
      id: orderId,
      date: new Date().toLocaleString('es-CO'),
      customer: { ...customer },
      paymentMethod,
      items: [...cart],
      subtotal,
      shippingFee,
      total,
      status: 'Pendiente',
    };

    const existingOrders = JSON.parse(localStorage.getItem('fadeaway_orders') || '[]');
    localStorage.setItem('fadeaway_orders', JSON.stringify([newOrder, ...existingOrders]));

    saveCart([]);
    setIsCheckoutOpen(false);
    setShowOrderSuccess(true);
  };

  const handleOpenWhatsApp = (customText?: string) => {
    const text = customText
      ? encodeURIComponent(customText)
      : encodeURIComponent('¡Hola FADEAWAY! Quisiera consultar sobre un producto o agendar un pedido.');
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    setChatMessages((prev) => [...prev, { sender: 'user', text: inputMessage }]);
    setInputMessage('');

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Entendido. Para darte una atención personalizada, presiona el botón de abajo para hablar directamente con un asesor por WhatsApp.',
        },
      ]);
    }, 800);
  };

  const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="min-h-screen bg-[#F6F6F6] text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white pb-20 relative">
      
      {/* Top Banner Bar */}
      <div className="bg-neutral-900 text-white text-[11px] font-medium tracking-wide text-center py-2 uppercase">
        Envíos Gratis por compras superiores a $150.000 COP
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 border-b border-neutral-200/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          
          <Link href="/" className="flex items-center">
            <div className="bg-black px-3 py-1.5 rounded-md">
              <img src="/logo.png" alt="FADEAWAY" className="h-6 w-auto object-contain mix-blend-screen" />
            </div>
          </Link>

          <nav className="hidden md:flex gap-8 text-xs font-semibold tracking-wider text-neutral-700">
            {Object.keys(menuData).map((key) => (
              <div
                key={key}
                className="relative py-5"
                onMouseEnter={() => setActiveTab(key)}
                onMouseLeave={() => setActiveTab(null)}
              >
                <button className={`transition-colors uppercase tracking-widest ${activeTab === key ? 'text-black font-bold' : 'hover:text-black'}`}>
                  {key}
                </button>

                {activeTab === key && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-[360px] bg-white border border-neutral-200 p-6 shadow-xl rounded-xl z-50">
                    <div className="grid grid-cols-2 gap-6 text-left">
                      {menuData[key].map((group, idx) => (
                        <div key={idx}>
                          <h4 className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase mb-3">{group.title}</h4>
                          <ul className="space-y-2">
                            {group.subcategories.map((sub, subIdx) => (
                              <li key={subIdx}>
                                <Link href={sub.href} className="text-xs text-neutral-700 hover:text-black font-medium transition-colors block">
                                  {sub.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-4 text-xs font-medium">
            <SearchButton />
            <button
              onClick={() => {
                loadCartFromStorage();
                setIsCartOpen(true);
              }}
              className="bg-black text-white px-3.5 py-1.5 rounded-full font-semibold text-xs hover:bg-neutral-800 transition-colors flex items-center gap-2"
            >
              <span>Carrito</span>
              <span className="bg-white text-black text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {totalItemsCount}
              </span>
            </button>
          </div>

        </div>
      </header>

      {/* CONTENIDO PRINCIPAL WEB */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-16">

        {/* HERO BANNER */}
        <section className="relative w-full h-[70vh] max-h-[600px] rounded-2xl overflow-hidden bg-neutral-900 shadow-md group">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img src={slide.img} alt={slide.title} className="w-full h-full object-cover object-center" />
              <div className="absolute inset-0 bg-black/40"></div>

              <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-white p-6">
                <span className="text-[11px] sm:text-xs uppercase tracking-widest font-semibold mb-3 bg-white/20 backdrop-blur-md px-4 py-1 rounded-full border border-white/30">
                  {slide.tag}
                </span>
                <h1 className="text-4xl sm:text-6xl font-serif italic mb-3 drop-shadow-lg tracking-tight">
                  {slide.title}
                </h1>
                <p className="text-xs sm:text-sm font-light max-w-md mb-6 text-neutral-100 drop-shadow">
                  {slide.description}
                </p>
                <button className="bg-white text-black px-7 py-3 rounded-full font-bold text-xs tracking-wider uppercase hover:bg-black hover:text-white transition-all shadow-xl">
                  {slide.buttonText}
                </button>
              </div>
            </div>
          ))}

          <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            ❮
          </button>
          <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            ❯
          </button>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentSlide === idx ? 'w-8 bg-white' : 'w-2 bg-white/50'
                }`}
              />
            ))}
          </div>
        </section>

        {/* NEW ARRIVALS GRID */}
        <section className="bg-white p-6 sm:p-10 rounded-2xl border border-neutral-200/80 shadow-sm">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">New Arrivals</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Agrega productos directamente o explora el menú de categorías superior.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {newArrivalsPlaceholders.map((item) => (
              <div key={item.id} className="group border border-neutral-100 p-3 rounded-xl hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="relative aspect-square bg-neutral-200 rounded-lg overflow-hidden mb-3 flex items-center justify-center p-2">
                    <span className="text-[11px] font-medium text-neutral-500 text-center">{item.name}</span>
                  </div>
                  <div className="flex justify-between items-start text-xs mb-2">
                    <div>
                      <h3 className="font-semibold text-neutral-900">{item.name}</h3>
                      <p className="text-neutral-400 text-[10px]">{item.category}</p>
                    </div>
                    <span className="font-bold text-neutral-900">{formatCOP(item.price)}</span>
                  </div>
                </div>

                <button
                  onClick={() => addToCart(item)}
                  className="w-full bg-black hover:bg-neutral-800 text-white text-[11px] font-bold py-2 rounded-lg transition-colors mt-2 uppercase tracking-wider"
                >
                  + Agregar al Carrito
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* BANNER SECCIÓN: ATENCIÓN PERSONALIZADA */}
        <section className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-black text-white rounded-2xl p-8 sm:p-12 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="max-w-xl text-center md:text-left">
            <span className="text-[10px] font-bold tracking-widest bg-white/20 px-3 py-1 rounded-full text-neutral-200 uppercase">
              Asesoría Personalizada
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif italic mt-3 mb-2">
              ¿Tienes dudas con tu talla o deseas agendar un pedido?
            </h2>
            <p className="text-xs text-neutral-300 font-light leading-relaxed">
              Nuestros asesores de FADEAWAY están disponibles para ayudarte a elegir prendas, verificar disponibilidad en bodega y gestionar tu compra de forma rápida y directa.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => handleOpenWhatsApp('¡Hola! Quiero agendar un pedido y consultar disponibilidad de prendas.')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase px-6 py-3.5 rounded-full shadow-lg transition-all flex items-center justify-center gap-2"
            >
              💬 Agendar por WhatsApp
            </button>
            <button
              onClick={() => setIsChatOpen(true)}
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold text-xs uppercase px-6 py-3.5 rounded-full backdrop-blur-md transition-all flex items-center justify-center gap-2"
            >
              🎧 Hablar con Asesor Web
            </button>
          </div>
        </section>

        {/* COLECCIONES DESTACADAS INTERACTIVAS */}
        <section className="bg-white p-6 sm:p-10 rounded-2xl border border-neutral-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
                Explora por Estilo
              </span>
              <h2 className="text-2xl font-bold text-neutral-900 tracking-tight mt-1">
                Colecciones Destacadas
              </h2>
            </div>
            <p className="text-xs text-neutral-500 max-w-xs">
              Haz clic en cualquier colección para ver las prendas y accesorios disponibles.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {featuredCollections.map((col, idx) => (
              <Link
                key={idx}
                href={col.href}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 block bg-neutral-900"
              >
                {col.image ? (
                  <img
                    src={col.image}
                    alt={col.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-800 border-2 border-dashed border-neutral-600 flex flex-col justify-center items-center text-center p-4">
                    <span className="text-2xl mb-1">🖼️</span>
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Subir foto aquí</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity group-hover:opacity-90" />

                <div className="absolute top-3 left-3 z-10">
                  <span className="bg-black/50 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/20">
                    {col.tag}
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-between items-end">
                  <div>
                    <h3 className="text-white font-bold text-base tracking-wide group-hover:text-neutral-200 transition-colors">
                      {col.name}
                    </h3>
                    <span className="text-[11px] text-neutral-300 font-medium flex items-center gap-1 mt-0.5">
                      Explorar productos <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    ↗
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </main>

      {/* DRAWER / SLIDE-OVER DEL CARRITO DE COMPRAS */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 p-6">
            
            <div className="flex justify-between items-center pb-4 border-b border-neutral-200">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-900">
                Tu Carrito ({totalItemsCount})
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="text-neutral-400 hover:text-black font-bold text-base">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-3xl block mb-2">🛒</span>
                  <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">Tu carrito está vacío</p>
                  <p className="text-[11px] text-neutral-400 mt-1">Navega por las categorías para agregar tus productos.</p>
                </div>
              ) : (
                cart.map((item, index) => (
                  <div key={item.id ? `${item.id}-${index}` : index} className="flex justify-between items-center bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                    <div className="flex-1 pr-3">
                      <h4 className="text-xs font-bold text-neutral-800">
                        {item.name} {item.size ? `(Talla: ${item.size})` : ''}
                      </h4>
                      <p className="text-[11px] text-neutral-500 font-semibold">{formatCOP(item.price)} c/u</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-neutral-300 rounded-lg overflow-hidden bg-white">
                        <button onClick={() => updateQuantity(item.id, -1)} className="px-2 py-0.5 text-xs hover:bg-neutral-100 font-bold">
                          -
                        </button>
                        <span className="px-2 text-xs font-semibold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="px-2 py-0.5 text-xs hover:bg-neutral-100 font-bold">
                          +
                        </button>
                      </div>

                      <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-neutral-200 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatCOP(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Costo de Envío</span>
                  {shippingFee === 0 ? (
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                      ENVÍO GRATIS ($0)
                    </span>
                  ) : (
                    <span className="font-semibold">{formatCOP(shippingFee)}</span>
                  )}
                </div>

                {subtotal < FREESHIPPING_THRESHOLD && (
                  <p className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded-lg text-center font-medium">
                    Agrega {formatCOP(FREESHIPPING_THRESHOLD - subtotal)} más para obtener Envío Gratis.
                  </p>
                )}

                <div className="flex justify-between text-sm font-bold text-neutral-900 pt-2 border-t border-neutral-100">
                  <span>Total</span>
                  <span>{formatCOP(total)}</span>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full bg-black text-white text-xs font-bold uppercase py-3.5 rounded-full hover:bg-neutral-800 transition-colors mt-3"
                >
                  Finalizar Compra
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CHECKOUT: DATOS DE ENVÍO Y MÉTODOS DE PAGO */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsCheckoutOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl p-6 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-200 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-900">
                Finalizar Compra — Datos de Envío & Pago
              </h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-neutral-400 hover:text-black font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmOrder} className="space-y-4 text-xs">
              
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">1. Datos del Destinatario</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1 uppercase text-[10px]">Nombre *</label>
                    <input
                      type="text"
                      name="nombre"
                      required
                      value={customer.nombre}
                      onChange={handleInputChange}
                      placeholder="Ej. Carlos"
                      className="w-full border border-neutral-300 rounded-lg p-2.5 outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1 uppercase text-[10px]">Apellido *</label>
                    <input
                      type="text"
                      name="apellido"
                      required
                      value={customer.apellido}
                      onChange={handleInputChange}
                      placeholder="Ej. Rodríguez"
                      className="w-full border border-neutral-300 rounded-lg p-2.5 outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1 uppercase text-[10px]">Ciudad / Municipio *</label>
                    <input
                      type="text"
                      name="ciudad"
                      required
                      value={customer.ciudad}
                      onChange={handleInputChange}
                      placeholder="Ej. Bogotá D.C."
                      className="w-full border border-neutral-300 rounded-lg p-2.5 outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1 uppercase text-[10px]">Teléfono / WhatsApp *</label>
                    <input
                      type="tel"
                      name="telefono"
                      required
                      value={customer.telefono}
                      onChange={handleInputChange}
                      placeholder="Ej. 3001234567"
                      className="w-full border border-neutral-300 rounded-lg p-2.5 outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1 uppercase text-[10px]">Dirección Completa *</label>
                  <input
                    type="text"
                    name="direccion"
                    required
                    value={customer.direccion}
                    onChange={handleInputChange}
                    placeholder="Calle, Carrera, N° de Apto, Barrio"
                    className="w-full border border-neutral-300 rounded-lg p-2.5 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1 uppercase text-[10px]">Notas de Envío (Opcional)</label>
                  <textarea
                    name="notas"
                    value={customer.notas}
                    onChange={handleInputChange}
                    placeholder="Instrucciones para la transportadora..."
                    rows={2}
                    className="w-full border border-neutral-300 rounded-lg p-2.5 outline-none focus:border-black resize-none"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-neutral-200">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">2. Método de Pago</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'nequi', title: 'Nequi', desc: 'Transferencia Directa' },
                    { id: 'daviplata', title: 'Daviplata', desc: 'Transferencia Directa' },
                    { id: 'contraentrega', title: 'Pago Contraentrega', desc: 'Paga al Recibir' },
                    { id: 'tarjeta', title: 'Tarjeta Crédito/Débito', desc: 'PSE / Tarjetas' },
                  ].map((m) => (
                    <label
                      key={m.id}
                      className={`border p-3 rounded-xl cursor-pointer transition-all flex flex-col ${
                        paymentMethod === m.id ? 'border-black bg-neutral-50 ring-1 ring-black' : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={m.id}
                        checked={paymentMethod === m.id}
                        onChange={() => setPaymentMethod(m.id as any)}
                        className="sr-only"
                      />
                      <span className="font-bold text-neutral-900">{m.title}</span>
                      <span className="text-[10px] text-neutral-500">{m.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-200 bg-neutral-50 p-3 rounded-xl space-y-1 text-neutral-700">
                <div className="flex justify-between">
                  <span>Productos:</span>
                  <span className="font-semibold">{formatCOP(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío:</span>
                  <span className="font-semibold">{shippingFee === 0 ? 'GRATIS' : formatCOP(shippingFee)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-neutral-900 pt-1 border-t border-neutral-200">
                  <span>Total a Pagar:</span>
                  <span>{formatCOP(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase py-4 rounded-full shadow-lg transition-colors"
              >
                Confirmar y Registrar Pedido
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE PEDIDO */}
      {showOrderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 text-center z-10">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold mb-3">
              ✓
            </div>
            <h3 className="text-lg font-bold text-neutral-900">¡Pedido Registrado con Éxito!</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Código de Orden: <span className="font-bold text-black">{lastOrderNumber}</span>
            </p>
            <p className="text-xs text-neutral-600 mt-3 leading-relaxed">
              Hemos registrado tus datos. Haz clic en el botón de abajo para enviar el comprobante o confirmar tu pedido directamente por WhatsApp con un asesor.
            </p>

            <div className="mt-6 space-y-2">
              <button
                onClick={() => {
                  handleOpenWhatsApp(`¡Hola FADEAWAY! Acabo de realizar el pedido N° ${lastOrderNumber}. Adjunto confirmación.`);
                  setShowOrderSuccess(false);
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase py-3 rounded-full shadow-md transition-colors flex items-center justify-center gap-2"
              >
                💬 Confirmar Pedido por WhatsApp
              </button>
              <button
                onClick={() => setShowOrderSuccess(false)}
                className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs py-2.5 rounded-full transition-colors"
              >
                Volver a la Tienda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT FLOTANTE DE ASESORÍA WEB */}
      {isChatOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 w-80 sm:w-96 bg-white border border-neutral-200 shadow-2xl rounded-2xl z-50 overflow-hidden flex flex-col h-[420px]">
          <div className="bg-neutral-900 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Asesor FADEAWAY</h4>
                <p className="text-[10px] text-neutral-400">En línea</p>
              </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="text-neutral-400 hover:text-white font-bold text-sm">
              ✕
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-neutral-50 text-xs">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.sender === 'user'
                    ? 'bg-black text-white ml-auto rounded-tr-none'
                    : 'bg-white text-neutral-800 border border-neutral-200 shadow-sm mr-auto rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <div className="p-3 bg-white border-t border-neutral-200 space-y-2">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-1 text-xs border border-neutral-300 rounded-full px-3 py-2 outline-none focus:border-black"
              />
              <button type="submit" className="bg-black text-white text-xs px-4 py-2 rounded-full font-bold">
                Enviar
              </button>
            </form>
            <button
              onClick={() => handleOpenWhatsApp('¡Hola! Vengo desde el chat de la página web y quiero asesoría.')}
              className="w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] py-2 rounded-xl transition-colors text-center block"
            >
              💬 Hablar por WhatsApp Directo
            </button>
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE WHATSAPP / CHAT */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        <button
          onClick={() => handleOpenWhatsApp()}
          className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-xl flex items-center justify-center text-xl transition-all transform hover:scale-110"
          title="Contactar por WhatsApp"
        >
          💬
        </button>
      </div>

      {/* BARRA INFERIOR MÓVIL (QUICK NAVIGATION) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-30 px-6 py-2.5 flex justify-between items-center text-xs font-semibold text-neutral-600">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-black">
          <span className="text-base">🏠</span>
          <span className="text-[10px]">Inicio</span>
        </Link>
        <button onClick={() => setIsChatOpen(!isChatOpen)} className="flex flex-col items-center gap-0.5">
          <span className="text-base">💬</span>
          <span className="text-[10px]">Asesor</span>
        </button>
        <button onClick={() => setIsCartOpen(true)} className="flex flex-col items-center gap-0.5 relative">
          <span className="text-base">🛒</span>
          <span className="text-[10px]">Carrito</span>
          {totalItemsCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-black text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {totalItemsCount}
            </span>
          )}
        </button>
      </div>

      {/* FOOTER */}
      <footer className="bg-black text-white mt-20 pt-12 pb-16 text-xs">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold uppercase tracking-widest text-sm mb-3">FADEAWAY</h3>
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              Marca de ropa urbana inspirada en la cultura del baloncesto, el streetwear japonés y la moda de Nueva York.
            </p>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-neutral-400 mb-3">Categorías</h4>
            <ul className="space-y-2 text-neutral-300">
              <li><Link href="/hombre/hoodies" className="hover:text-white">Hombre</Link></li>
              <li><Link href="/mujer/tops" className="hover:text-white">Mujer</Link></li>
              <li><Link href="/kids/camisetas" className="hover:text-white">Kids</Link></li>
              <li><Link href="/accesorios/gorras" className="hover:text-white">Accesorios</Link></li>
              <li><Link href="/perfumeria/hombre" className="hover:text-white">Perfumería</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-neutral-400 mb-3">Atención al Cliente</h4>
            <ul className="space-y-2 text-neutral-300">
              <li><button onClick={() => handleOpenWhatsApp()} className="hover:text-white">Preguntas Frecuentes</button></li>
              <li><button onClick={() => handleOpenWhatsApp()} className="hover:text-white">Envíos & Devoluciones</button></li>
              <li><button onClick={() => handleOpenWhatsApp()} className="hover:text-white">Guía de Tallas</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-neutral-400 mb-3">Síguenos</h4>
            <p className="text-neutral-400 mb-3 text-[11px]">Únete a la comunidad FADEAWAY en redes sociales.</p>
            <div className="flex gap-3">
              <span className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center cursor-pointer hover:bg-neutral-700">IG</span>
              <span className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center cursor-pointer hover:bg-neutral-700">TK</span>
              <span className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center cursor-pointer hover:bg-neutral-700">FB</span>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-6 border-t border-neutral-800 text-center text-neutral-500 text-[10px]">
          © {new Date().getFullYear()} FADEAWAY Streetwear. Todos los derechos reservados.
        </div>
      </footer>

    </div>
  );
}