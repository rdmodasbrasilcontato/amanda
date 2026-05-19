import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? '';

async function backendGet(path: string) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { 'x-admin-key': ADMIN_API_KEY },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Backend ${path} returned ${res.status}`);
  return res.json();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') ?? 'status';

  try {
    if (action === 'qrcode') {
      const data = await backendGet('/admin/qrcode');
      return NextResponse.json(data);
    }

    const data = await backendGet('/admin/status');
    return NextResponse.json({
      connected: data.whatsapp?.connected ?? false,
      status: data.whatsapp?.status ?? 'unknown',
      instance: data.whatsapp,
      stats: data.stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { connected: false, status: 'offline', error: err.message },
      { status: 200 }
    );
  }
}
