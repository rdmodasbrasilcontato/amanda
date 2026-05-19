import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  const sb = createServerClient();

  const { data, error } = await sb
    .from('produtos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    // Tabela pode não existir — retorna vazio
    return NextResponse.json({ produtos: [] });
  }

  const produtos = (data ?? []).map((p: any) => ({
    id: p.id,
    nome: p.name ?? p.nome ?? '—',
    categoria: p.category ?? p.categoria ?? '—',
    preco: p.price ?? p.preco ?? 0,
    estoque: p.stock ?? p.estoque ?? 0,
    vistos: p.views ?? p.vistos ?? 0,
    citados: p.mentions ?? p.citados ?? 0,
    vendidos: p.sold ?? p.vendidos ?? 0,
    imagem: p.image_url ?? p.imagem ?? null,
  }));

  return NextResponse.json({ produtos });
}
