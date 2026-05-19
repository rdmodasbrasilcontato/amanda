import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: Request) {
  const sb = createServerClient();
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '50');
  const search = searchParams.get('search') ?? '';

  let query = sb
    .from('clientes')
    .select(`
      id, phone, name, preferred_name, opt_out, emotion_profile,
      purchase_count, last_contact_at, tags, notes, created_at,
      customer_behavior_profile (
        lead_score, comportamento_dominante, categoria_favorita,
        ticket_medio, frequencia_compra, score_engajamento,
        score_emocional, probabilidade_compra, intencao_dominante
      )
    `, { count: 'exact' })
    .eq('opt_out', false)
    .order('last_contact_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Normalizar para o formato esperado pelo dashboard
  const clientes = (data ?? []).map((c: any) => {
    const bp = Array.isArray(c.customer_behavior_profile)
      ? c.customer_behavior_profile[0]
      : c.customer_behavior_profile;

    const ep = (c.emotion_profile ?? {}) as Record<string, number>;
    const emocaoDominante = Object.entries(ep).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutro';

    return {
      id: c.id,
      nome: c.name ?? c.preferred_name ?? c.phone,
      telefone: c.phone,
      cidade: c.notes ?? '—',
      estado: '',
      leadScore: bp?.lead_score ?? 0,
      emocaoDominante,
      comportamento: bp?.comportamento_dominante ?? '—',
      categoriaFavorita: bp?.categoria_favorita ?? '—',
      ticketMedio: bp?.ticket_medio ?? 0,
      frequencia: bp?.frequencia_compra ?? 0,
      ultimaInteracao: c.last_contact_at ?? c.created_at,
      status: (c.tags ?? []).includes('vip') ? 'vip'
        : (c.tags ?? []).includes('quente') ? 'quente'
        : (c.tags ?? []).includes('morno') ? 'morno'
        : (c.tags ?? []).includes('frio') ? 'frio'
        : 'ativo',
      quantidadeCompras: c.purchase_count ?? 0,
      valorTotalGasto: (c.purchase_count ?? 0) * (bp?.ticket_medio ?? 0),
      engajamento: bp?.score_engajamento ?? 0,
      scoreEmocional: bp?.score_emocional ?? 0,
      probabilidadeCompra: bp?.probabilidade_compra ?? 0,
      intencaoDominante: bp?.intencao_dominante ?? 'pesquisa',
      tags: c.tags ?? [],
    };
  });

  return NextResponse.json({ clientes, total: count ?? 0, page, limit });
}
