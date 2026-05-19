import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? '';

export async function POST() {
  try {
    const res = await fetch(`${BACKEND_URL}/admin/followups/process`, {
      method: 'POST',
      headers: { 'x-admin-key': ADMIN_API_KEY },
    });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
