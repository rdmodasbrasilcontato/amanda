import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const sb = createServerClient();

    // Run all queries in parallel
    const [
      topClientesRes,
      funilRes,
      ticketMedioRes,
      totalReceitaRes,
      categoriasRes,
      intencoesRes,
      comportamentosRes,
      retencaoRes,
      rfmTotalRes,
      rfmCampioesRes,
      rfmCrescimentoRes,
      rfmRiscoRes,
      rfmPerdidosRes,
    ] = await Promise.all([
      // Top 10 clients by valor_total_gasto
      sb
        .from('clientes')
        .select(
          'nome, nome_preferido, telefone, valor_total_gasto, total_pedidos, temperatura_lead, categoria_favorita, ultima_interacao'
        )
        .order('valor_total_gasto', { ascending: false, nullsFirst: false })
        .limit(10),

      // Count by etapa_funil
      sb.from('clientes').select('etapa_funil').neq('etapa_funil', null),

      // Average ticket_medio
      sb
        .from('clientes')
        .select('ticket_medio')
        .gt('ticket_medio', 0),

      // Sum of valor_total_gasto
      sb.from('clientes').select('valor_total_gasto').gt('valor_total_gasto', 0),

      // Top categories by count
      sb
        .from('clientes')
        .select('categoria_favorita')
        .neq('categoria_favorita', null),

      // Intentions from behavior profile
      sb
        .from('customer_behavior_profile')
        .select('intencao_dominante')
        .neq('intencao_dominante', null),

      // Behaviors from behavior profile
      sb
        .from('customer_behavior_profile')
        .select('comportamento_dominante')
        .neq('comportamento_dominante', null),

      // Retention: clients with total_pedidos > 1
      sb.from('clientes').select('total_pedidos', { count: 'exact' }),

      // RFM: total non-blocked clients
      sb
        .from('clientes')
        .select('id', { count: 'exact' })
        .eq('bloqueado', false)
        .eq('opt_out', false),

      // RFM: Campeões — temp >= 81 and total_pedidos >= 3
      sb
        .from('clientes')
        .select('id', { count: 'exact' })
        .gte('temperatura_lead', 81)
        .gte('total_pedidos', 3)
        .eq('bloqueado', false)
        .eq('opt_out', false),

      // RFM: Em crescimento — temp 51-80
      sb
        .from('clientes')
        .select('id', { count: 'exact' })
        .gte('temperatura_lead', 51)
        .lt('temperatura_lead', 81)
        .eq('bloqueado', false)
        .eq('opt_out', false),

      // RFM: Em risco — temp < 21 and ultima_interacao < 30 days ago
      sb
        .from('clientes')
        .select('id', { count: 'exact' })
        .lt('temperatura_lead', 21)
        .lt('ultima_interacao', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .eq('bloqueado', false)
        .eq('opt_out', false),

      // RFM: Perdidos — opt_out or bloqueado
      sb
        .from('clientes')
        .select('id', { count: 'exact' })
        .or('opt_out.eq.true,bloqueado.eq.true'),
    ]);

    // Process top clientes
    const topClientes = (topClientesRes.data ?? []).map((c: any) => ({
      nome: c.nome_preferido ?? c.nome ?? c.telefone,
      telefone: c.telefone,
      valor_total_gasto: c.valor_total_gasto ?? 0,
      total_pedidos: c.total_pedidos ?? 0,
      temperatura_lead: c.temperatura_lead ?? 0,
      categoria_favorita: c.categoria_favorita ?? null,
      ultima_interacao: c.ultima_interacao ?? null,
    }));

    // Process funil counts
    const funilCounts: Record<string, number> = {};
    for (const c of funilRes.data ?? []) {
      const etapa = c.etapa_funil ?? 'sem_etapa';
      funilCounts[etapa] = (funilCounts[etapa] ?? 0) + 1;
    }

    // Average ticket_medio
    const ticketArr = (ticketMedioRes.data ?? []).map((c: any) => c.ticket_medio ?? 0);
    const ticketMedio =
      ticketArr.length > 0 ? ticketArr.reduce((a: number, b: number) => a + b, 0) / ticketArr.length : 0;

    // Total receita
    const totalReceita = (totalReceitaRes.data ?? []).reduce(
      (sum: number, c: any) => sum + (c.valor_total_gasto ?? 0),
      0
    );

    // Top categories
    const categoriaCounts: Record<string, number> = {};
    for (const c of categoriasRes.data ?? []) {
      const cat = c.categoria_favorita;
      if (cat) categoriaCounts[cat] = (categoriaCounts[cat] ?? 0) + 1;
    }
    const categorias = Object.entries(categoriaCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([categoria, count]) => ({ categoria, count }));

    // Top intentions
    const intencaoCounts: Record<string, number> = {};
    for (const c of intencoesRes.data ?? []) {
      const i = c.intencao_dominante;
      if (i) intencaoCounts[i] = (intencaoCounts[i] ?? 0) + 1;
    }
    const intencoes = Object.entries(intencaoCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([intencao, count]) => ({ intencao, count }));

    // Top behaviors
    const comportamentoCounts: Record<string, number> = {};
    for (const c of comportamentosRes.data ?? []) {
      const b = c.comportamento_dominante;
      if (b) comportamentoCounts[b] = (comportamentoCounts[b] ?? 0) + 1;
    }
    const comportamentos = Object.entries(comportamentoCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([comportamento, count]) => ({ comportamento, count }));

    // Retention rate
    const allClientes = retencaoRes.data ?? [];
    const totalClientes = allClientes.length;
    const recorrentes = allClientes.filter((c: any) => (c.total_pedidos ?? 0) > 1).length;
    const retencao = totalClientes > 0 ? (recorrentes / totalClientes) * 100 : 0;

    // RFM segments
    const rfmTotal = rfmTotalRes.count ?? 0;
    const campioes = rfmCampioesRes.count ?? 0;
    const emCrescimento = rfmCrescimentoRes.count ?? 0;
    const emRisco = rfmRiscoRes.count ?? 0;
    const perdidos = rfmPerdidosRes.count ?? 0;
    const regulares = Math.max(0, rfmTotal - campioes - emCrescimento - emRisco);

    const rfm = [
      { segmento: 'Campeões', count: campioes },
      { segmento: 'Em crescimento', count: emCrescimento },
      { segmento: 'Em risco', count: emRisco },
      { segmento: 'Perdidos', count: perdidos },
      { segmento: 'Regulares', count: regulares },
    ];

    return NextResponse.json({
      topClientes,
      funil: funilCounts,
      ticketMedio,
      totalReceita,
      categorias,
      intencoes,
      comportamentos,
      retencao,
      rfm,
    });
  } catch (err: any) {
    console.error('CRM API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
