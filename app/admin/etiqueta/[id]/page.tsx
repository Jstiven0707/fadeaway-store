'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ESTADOS, METODOS_PAGO, type Pedido } from '@/lib/pedidos';
import { formatCOP } from '@/lib/products';

/**
 * Etiqueta de envío lista para imprimir.
 *
 * El tamaño se elige en pantalla y se aplica con @page, que es lo que lee el
 * driver de la impresora. Asi la misma pagina sirve para una termica de
 * 10x15, una de rollo angosto o una hoja carta: no hay que tocar codigo
 * cuando se compre la maquina.
 *
 * Todo lo que es control (los botones de arriba) lleva .sin-imprimir, asi que
 * en el papel solo sale la etiqueta.
 */

type Formato = '10x15' | '10x10' | '5x7' | 'carta';

const FORMATOS: Record<Formato, { label: string; css: string; ancho: string; pie: string }> = {
  '10x15': {
    label: '10 × 15 cm',
    css: '100mm 150mm',
    ancho: '100mm',
    pie: 'La medida estándar de envíos. Zebra, Xprinter, Bixolon y similares.',
  },
  '10x10': {
    label: '10 × 10 cm',
    css: '100mm 100mm',
    ancho: '100mm',
    pie: 'Cuadrada. Cabe sin el detalle de productos.',
  },
  '5x7': {
    label: '5 × 7 cm',
    css: '50mm 70mm',
    ancho: '50mm',
    pie: 'Rollo angosto. Solo caben los datos del cliente.',
  },
  carta: {
    label: 'Hoja carta',
    css: 'Letter',
    ancho: '170mm',
    pie: 'Para impresora normal. Se recorta a mano.',
  },
};

export default function EtiquetaPedido() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formato, setFormato] = useState<Formato>('10x15');
  // En las etiquetas chicas no cabe el detalle, y forzarlo deja letra ilegible
  const [conDetalle, setConDetalle] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${id}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      setPedido(json.data);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    if (id) cargar();
  }, [id, cargar]);

  // Las etiquetas pequeñas no dan para el detalle: se apaga solo
  useEffect(() => {
    if (formato === '5x7') setConDetalle(false);
  }, [formato]);

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-6 font-sans">
        <p className="text-sm font-bold text-red-700">{error}</p>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center font-sans">
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Cargando...</p>
      </div>
    );
  }

  const contraentrega = pedido.metodoPago === 'CONTRAENTREGA';
  const chico = formato === '5x7';

  return (
    <div className="min-h-screen bg-neutral-200 font-sans">
      <style>{`
        @page { size: ${FORMATOS[formato].css}; margin: 4mm; }
        @media print {
          .sin-imprimir { display: none !important; }
          html, body { background: #fff !important; }
          .etiqueta {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: auto !important;
          }
        }
      `}</style>

      {/* CONTROLES (no se imprimen) */}
      <div className="sin-imprimir bg-black text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-4 justify-between">
          <div>
            <p className="font-black uppercase text-sm tracking-tight">
              Etiqueta de envío · {pedido.numero}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">{FORMATOS[formato].pie}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {(Object.keys(FORMATOS) as Formato[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormato(f)}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  formato === f ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {FORMATOS[f].label}
              </button>
            ))}

            <label
              className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-800 ${
                chico ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-neutral-700'
              }`}
              title={chico ? 'En 5 × 7 cm no cabe el detalle' : 'Incluir los productos del pedido'}
            >
              <input
                type="checkbox"
                disabled={chico}
                checked={conDetalle}
                onChange={(e) => setConDetalle(e.target.checked)}
              />
              Detalle
            </label>

            <button
              onClick={() => window.print()}
              className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2 rounded-lg uppercase tracking-wider transition-colors"
            >
              Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* LA ETIQUETA */}
      <div className="p-6 flex justify-center sin-fondo-impresion">
        <div
          className="etiqueta bg-white text-black shadow-xl border border-neutral-300 p-4 leading-tight"
          style={{ width: FORMATOS[formato].ancho }}
        >
          {/* Cabecera */}
          <div
            className={`border-b-2 border-black pb-2 ${
              // En la etiqueta chica el logo y el numero no caben lado a lado
              chico ? 'text-center' : 'flex items-center justify-between gap-2'
            }`}
          >
            <img
              src="/logo-wordmark.png"
              alt="OCEANPARK"
              className={`${chico ? 'h-3 mx-auto' : 'h-5'} w-auto object-contain`}
            />
            <div className={chico ? 'mt-1' : 'text-right'}>
              <p className={`font-black leading-none whitespace-nowrap ${chico ? 'text-[11px]' : 'text-sm'}`}>
                {pedido.numero}
              </p>
              <p className="text-[8px] text-neutral-500 mt-0.5">
                {new Date(pedido.fecha).toLocaleDateString('es-CO', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Destinatario: lo mas grande de la etiqueta, es lo que lee el mensajero */}
          <div className="py-2.5 border-b border-dashed border-neutral-400">
            <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-500">Destinatario</p>
            <p className={`font-black uppercase ${chico ? 'text-xs' : 'text-base'} mt-0.5`}>
              {pedido.nombre} {pedido.apellido}
            </p>
            <p className={`${chico ? 'text-[9px]' : 'text-[11px]'} font-semibold mt-1`}>
              {pedido.direccionEnvio}
            </p>
            <p className={`${chico ? 'text-[10px]' : 'text-xs'} font-bold uppercase mt-0.5`}>
              {pedido.ciudad}
            </p>
            <p className={`${chico ? 'text-[9px]' : 'text-[11px]'} font-bold mt-1`}>
              Tel. {pedido.telefono}
            </p>
          </div>

          {/* Pago: si es contraentrega, el monto a cobrar va enorme */}
          <div className="py-2.5 border-b border-dashed border-neutral-400">
            {contraentrega ? (
              <div className="bg-black text-white rounded px-2.5 py-2 text-center">
                <p className="text-[8px] font-bold uppercase tracking-widest">Cobrar al entregar</p>
                <p className={`font-black ${chico ? 'text-sm' : 'text-xl'} leading-tight`}>
                  {formatCOP(pedido.total)}
                </p>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-500">Pago</p>
                  <p className="text-[11px] font-black uppercase">
                    {METODOS_PAGO[pedido.metodoPago].label} · Pagado
                  </p>
                </div>
                <p className="text-[11px] font-bold">{formatCOP(pedido.total)}</p>
              </div>
            )}
          </div>

          {/* Detalle del contenido */}
          {conDetalle && (
            <div className="py-2.5 border-b border-dashed border-neutral-400">
              <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
                Contenido
              </p>
              <table className="w-full text-[9px]">
                <tbody>
                  {pedido.items.map((it, i) => (
                    <tr key={i} className="align-top">
                      <td className="font-black w-6">{it.cantidad}×</td>
                      <td className="font-semibold pr-1">
                        {it.nombreProducto}
                        <span className="text-neutral-500"> · {it.presentacion}</span>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {formatCOP(it.precioUnitario * it.cantidad)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pedido.costoEnvio > 0 && (
                <p className="text-[9px] text-right mt-1 text-neutral-600">
                  Envío {formatCOP(pedido.costoEnvio)}
                </p>
              )}
              <p className="text-[10px] text-right font-black mt-0.5">
                Total {formatCOP(pedido.total)}
              </p>
            </div>
          )}

          {/* Notas del cliente: el mensajero las necesita (portería, referencia) */}
          {pedido.notas && (
            <div className="py-2 border-b border-dashed border-neutral-400">
              <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-500">Nota</p>
              <p className="text-[9px] font-semibold">{pedido.notas}</p>
            </div>
          )}

          <div className="pt-2 flex justify-between items-center text-[8px] text-neutral-500">
            <span className="font-bold uppercase">{ESTADOS[pedido.estado].label}</span>
            <span>oceanpark · {pedido.canal}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
