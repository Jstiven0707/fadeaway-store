'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface ItemCalificable {
  idProducto: number | null;
  nombreProducto: string;
  presentacion: string;
}

interface DatosResena {
  numero: string;
  nombre: string;
  items: ItemCalificable[];
  yaCalificados: number[];
}

/** Estrellas de 1 a 5, clickeables. */
function Estrellas({
  valor,
  onChange,
}: {
  valor: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} de 5 estrellas`}
          className={`text-2xl leading-none transition-transform hover:scale-110 ${
            n <= valor ? 'text-amber-400' : 'text-neutral-300'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function PaginaResena() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';

  const [datos, setDatos] = useState<DatosResena | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  // calificacion y comentario por producto
  const [valores, setValores] = useState<Record<number, { calificacion: number; comentario: string }>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviews?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Enlace no válido');
      setDatos(json.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) cargar();
  }, [token, cargar]);

  const cambiar = (id: number, campo: 'calificacion' | 'comentario', valor: number | string) => {
    setValores((prev) => {
      const actual = prev[id] ?? { calificacion: 0, comentario: '' };
      return { ...prev, [id]: { ...actual, [campo]: valor } };
    });
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;

    const calificaciones = Object.entries(valores)
      .map(([id, v]) => ({
        idProducto: Number(id),
        calificacion: v.calificacion,
        comentario: v.comentario,
      }))
      .filter((c) => c.calificacion > 0);

    if (calificaciones.length === 0) {
      setError('Elige al menos una calificación con estrellas.');
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, calificaciones }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'No se pudo enviar');
      setListo(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const pendientes =
    datos?.items.filter(
      (i) => i.idProducto !== null && !datos.yaCalificados.includes(i.idProducto)
    ) ?? [];

  return (
    <div className="min-h-screen bg-[#F6F6F6] text-neutral-900 font-sans">
      <header className="bg-white border-b border-neutral-200 py-5 px-6">
        <div className="max-w-2xl mx-auto flex justify-center">
          <Link href="/">
            <img src="/logo-wordmark.png" alt="OCEANPARK" className="h-10 w-auto object-contain" />
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {cargando ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
            <p className="text-xs text-neutral-500">Cargando tu pedido...</p>
          </div>
        ) : listo ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
            <span className="text-4xl block mb-3">💛</span>
            <h1 className="text-xl font-bold text-neutral-900">¡Gracias por calificarnos!</h1>
            <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
              Tu opinión ayuda a otras personas a elegir mejor, y a nosotros a mejorar.
            </p>
            <Link
              href="/"
              className="inline-block mt-6 bg-black text-white text-xs font-bold uppercase px-7 py-3 rounded-full hover:bg-neutral-800 transition-colors"
            >
              Volver a la tienda
            </Link>
          </div>
        ) : !datos ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
            <span className="text-3xl block mb-3">🔒</span>
            <h1 className="text-lg font-bold text-neutral-900">Este enlace no es válido</h1>
            <p className="text-xs text-neutral-500 mt-2">
              {error || 'Puede que haya expirado o que el pedido aún no esté entregado.'}
            </p>
            <Link href="/" className="inline-block mt-5 text-xs font-bold underline">
              ← Ir a la tienda
            </Link>
          </div>
        ) : pendientes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
            <span className="text-3xl block mb-3">✓</span>
            <h1 className="text-lg font-bold text-neutral-900">Ya calificaste este pedido</h1>
            <p className="text-xs text-neutral-500 mt-2">Gracias, {datos.nombre}.</p>
            <Link href="/" className="inline-block mt-5 text-xs font-bold underline">
              ← Ir a la tienda
            </Link>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-5">
            <div className="text-center">
              <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
                Pedido {datos.numero}
              </span>
              <h1 className="text-2xl font-serif italic text-neutral-900 mt-1">
                {datos.nombre}, ¿cómo te fue?
              </h1>
              <p className="text-xs text-neutral-500 mt-2">
                Califica lo que recibiste. Toma menos de un minuto.
              </p>
            </div>

            {pendientes.map((item) => (
              <div
                key={item.idProducto}
                className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3"
              >
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">{item.nombreProducto}</h2>
                  <span className="text-[11px] text-neutral-400">{item.presentacion}</span>
                </div>

                <Estrellas
                  valor={valores[item.idProducto as number]?.calificacion ?? 0}
                  onChange={(n) => cambiar(item.idProducto as number, 'calificacion', n)}
                />

                <textarea
                  rows={3}
                  value={valores[item.idProducto as number]?.comentario ?? ''}
                  onChange={(e) => cambiar(item.idProducto as number, 'comentario', e.target.value)}
                  placeholder="Cuéntanos qué te pareció (opcional)"
                  className="w-full border border-neutral-300 rounded-xl p-3 text-xs outline-none focus:border-black resize-none"
                />
              </div>
            ))}

            {error && (
              <p className="bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold rounded-xl p-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase py-4 rounded-full transition-colors disabled:bg-neutral-300"
            >
              {enviando ? 'Enviando...' : 'Enviar calificación'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
