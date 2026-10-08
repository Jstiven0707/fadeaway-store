import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB de entrada
const ANCHO_MAXIMO = 1200; // se reescala antes de guardar
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

const CARPETA = path.join(process.cwd(), 'public', 'uploads');

/**
 * Recibe la foto de un producto y la guarda en public/uploads.
 *
 * La imagen se reescala y se reconvierte a webp con sharp. Eso cumple tres
 * cosas a la vez: pesa mucho menos, queda en un formato unico, y al
 * reprocesarla se descarta cualquier archivo que no sea una imagen real.
 *
 * Devuelve la ruta publica (/uploads/xxx.webp), que es lo que se guarda en
 * productos.image_url. Antes las fotos iban en base64 dentro del navegador,
 * con un tope de ~5MB para todo el catalogo.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const archivo = formData.get('file');

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No se recibio ningun archivo' },
        { status: 400 }
      );
    }

    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      return NextResponse.json(
        { success: false, error: 'Formato no permitido. Usa JPG, PNG, WEBP o AVIF.' },
        { status: 400 }
      );
    }

    if (archivo.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: 'La imagen supera los 8 MB' },
        { status: 400 }
      );
    }

    const entrada = Buffer.from(await archivo.arrayBuffer());

    // Reprocesar con sharp valida que sea una imagen de verdad: si no lo es, lanza.
    const salida = await sharp(entrada)
      .rotate() // respeta la orientacion EXIF de las fotos de celular
      .resize({ width: ANCHO_MAXIMO, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    await mkdir(CARPETA, { recursive: true });

    const nombre = `${Date.now()}-${randomUUID().slice(0, 8)}.webp`;
    await writeFile(path.join(CARPETA, nombre), salida);

    return NextResponse.json({
      success: true,
      url: `/uploads/${nombre}`,
      bytes: salida.length,
    });
  } catch (error) {
    console.error('Error subiendo la imagen:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo procesar la imagen' },
      { status: 500 }
    );
  }
}
