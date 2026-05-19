import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const sb = createServerClient();

    const { data, error } = await sb
      .from('produtos')
      .select('*')
      .eq('ativo', true)
      .order('criado_em', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ produtos: [] });
    }

    const produtos = (data ?? []).map((p: any) => ({
      id: p.id,
      nome: p.nome ?? '—',
      categoria: p.categoria_id ?? p.categoria ?? '—',
      preco: p.preco ?? 0,
      estoque: p.estoque ?? 0,
      vistos: p.vistos ?? 0,
      citados: p.citados ?? 0,
      vendidos: p.vendidos ?? 0,
      imagem: p.url_imagem_principal ?? null,
      tamanhos: p.tamanhos ?? [],
      descricao: p.descricao_curta ?? '',
    }));

    return NextResponse.json({ produtos });
  } catch (err: any) {
    console.error('Produtos API error:', err);
    return NextResponse.json({ produtos: [] });
  }
}

export async function POST(req: Request) {
  try {
    const sb = createServerClient();
    const body = await req.json();

    const { data, error } = await sb
      .from('produtos')
      .insert({
        nome: body.nome,
        descricao_curta: body.descricao,
        preco: body.preco,
        tamanhos: body.tamanhos ?? [],
        estoque: body.estoque ?? 0,
        ativo: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
