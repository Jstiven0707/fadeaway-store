'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Duenio {
  id: number;
  nombre: string;
  usuario: string;
}

/**
 * Pantalla donde alguien pone una contraseña nueva con el enlace que le
 * generó el dueño de la tienda. El enlace sirve una sola vez y caduca.
 */
export default function PaginaClave() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';

  const [duenio, setDuenio] = useState<Duenio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [repetida, setRepetida] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  const validar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/clave?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      setDuenio(json.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) validar();
  }, [token, validar]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;

    if (password !== repetida) {
      setError('Las dos contraseñas no coinciden');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      const res = await fetch('/api/clave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      setListo(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-block bg-black px-6 py-3 rounded-lg mb-3">
            <img src="/logo-wordmark.png" alt="OCEANPARK" className="h-12 w-auto object-contain brightness-0 invert" />
          </div>
        </div>

        {cargando ? (
          <p className="text-center text-xs text-neutral-500 py-6">Comprobando el enlace...</p>
        ) : listo ? (
          <div className="text-center">
            <span className="text-3xl block mb-3">✓</span>
            <h1 className="text-lg font-black text-neutral-900 uppercase">Contraseña actualizada</h1>
            <p className="text-xs text-neutral-500 mt-2">Ya puedes entrar al panel con tu clave nueva.</p>
            <Link
              href="/admin"
              className="inline-block mt-6 bg-black text-white text-xs font-bold uppercase px-7 py-3 rounded-full hover:bg-neutral-800 transition-colors"
            >
              Ir al panel
            </Link>
          </div>
        ) : !duenio ? (
          <div className="text-center">
            <span className="text-3xl block mb-3">🔒</span>
            <h1 className="text-lg font-black text-neutral-900 uppercase">Enlace no válido</h1>
            <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
              {error || 'Puede que ya se haya usado o que hayan pasado las 2 horas.'}
            </p>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4 text-xs">
            <div className="text-center mb-2">
              <h1 className="text-lg font-black text-neutral-900 uppercase">Nueva contraseña</h1>
              <p className="text-xs text-neutral-500 mt-1">
                Hola {duenio.nombre}, estás cambiando la clave de <strong>{duenio.usuario}</strong>.
              </p>
            </div>

            <div>
              <label className="block font-bold text-neutral-800 uppercase mb-1">Contraseña nueva</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full bg-white border border-neutral-300 text-neutral-900 text-sm rounded-xl p-3 outline-none focus:border-black font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-800 uppercase mb-1">Repítela</label>
              <input
                type="password"
                required
                minLength={8}
                value={repetida}
                onChange={(e) => setRepetida(e.target.value)}
                placeholder="La misma de arriba"
                className="w-full bg-white border border-neutral-300 text-neutral-900 text-sm rounded-xl p-3 outline-none focus:border-black font-semibold"
              />
            </div>

            {error && (
              <p className="bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold rounded-xl p-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={guardando}
              className="w-full bg-black text-white font-bold py-3.5 rounded-xl uppercase tracking-wider hover:bg-neutral-800 transition-all disabled:bg-neutral-300"
            >
              {guardando ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
