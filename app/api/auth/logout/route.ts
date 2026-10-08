import { NextResponse } from 'next/server';
import { cerrarSesionCookie } from '@/lib/auth';

export async function POST() {
  await cerrarSesionCookie();
  return NextResponse.json({ success: true, data: null });
}
