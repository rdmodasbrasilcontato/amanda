import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const sb = createServerClient();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status') ?? '';

    let q = sb
      .from('clientes')
      .select(`
        id, telefone, nome, nome_preferido, opt_out, emocao_recorrente,
        total_pedidos, ultima_interacao, nivel_engajamento, temperatura_lead,
        etapa_funil, cidade, estado, valor_total_gasto, ticket_medio,
        produtos_citados, categoria_favorita, criado_em,
        customer_behavior_profile (
          lead_score, comportamento_dominante, categoria_favorita,
          ticket_medio, frequencia_compra, score_engajamento,
          score_emocional, probabilidade_compra, intencao_dominante
        )
      `, { count: 'exact' })
      .eq('opt_out', false)
      .order('ultima_interacao', { ascending: false, nullsFirst: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      q = q.or(`nome.ilike.%${search}%,telefone.ilike.%${search}%`);
    }

    // Filter by temperatura_lead based on status
    if (status === 'vip') {
      q = q.gte('temperatura_lead', 81);
    } else if (status === 'quente') {
      q = q.gte('temperatura_lead', 51).lt('temperatura_lead', 81);
    } else if (status === 'morno') {
      q = q.gte('temperatura_lead', 21).lt('temperatura_lead', 51);
    } else if (status === 'frio') {
      q = q.lt('temperatura_lead', 21);
    }

    const { data, error, count } = await q;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const clientes = (data ?? []).map((c: any) => {
      const bp = Array.isArray(c.customer_behavior_profile)
        ? c.customer_behavior_profile[0]
        : c.customer_behavior_profile;

      const temperatura = c.temperatura_lead ?? 0;
      const status = temperatura >= 81 ? 'vip'
        : temperatura >= 51 ? 'quente'
        : temperatura >= 21 ? 'morno'
        : 'frio';

      return {
        id: c.id,
        nome: c.nome_preferido ?? c.nome ?? c.telefone,
        telefone: c.telefone,
        cidade: c.cidade ?? '—',
        estado: c.estado ?? '',
        leadScore: bp?.lead_score ?? temperatura,
        emocaoDominante: c.emocao_recorrente ?? 'neutro',
        comportamento: bp?.comportamento_dominante ?? c.nivel_engajamento ?? '—',
        categoriaFavorita: bp?.categoria_favorita ?? c.categoria_favorita ?? '—',
        ticketMedio: bp?.ticket_medio ?? c.ticket_medio ?? 0,
        frequencia: bp?.frequencia_compra ?? 0,
        ultimaInteracao: c.ultima_interacao ?? c.criado_em,
        status,
        quantidadeCompras: c.total_pedidos ?? 0,
        valorTotalGasto: c.valor_total_gasto ?? 0,
        engajamento: bp?.score_engajamento ?? 0,
        scoreEmocional: bp?.score_emocional ?? 0,
        probabilidadeCompra: bp?.probabilidade_compra ?? 0,
        intencaoDominante: bp?.intencao_dominante ?? 'pesquisa',
        tags: c.nivel_engajamento ? [c.nivel_engajamento] : [],
      };
    });

    return NextResponse.json({ clientes, total: count ?? 0, page, limit });
  } catch (err: any) {
    console.error('Clientes API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
