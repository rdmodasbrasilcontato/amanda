import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

type Periodo = 'diario' | 'semanal' | 'mensal' | 'anual';

function getPeriodStart(periodo: Periodo): Date {
  const now = new Date();
  switch (periodo) {
    case 'diario':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'semanal':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'mensal':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'anual':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  }
}

function getDaysBuckets(start: Date, end: Date): string[] {
  const days: string[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export async function GET(req: Request) {
  try {
    const sb = createServerClient();
    const { searchParams } = new URL(req.url);
    const periodoParam = (searchParams.get('periodo') ?? 'mensal') as Periodo;

    const validPeriods: Periodo[] = ['diario', 'semanal', 'mensal', 'anual'];
    const periodo = validPeriods.includes(periodoParam) ? periodoParam : 'mensal';

    const start = getPeriodStart(periodo);
    const startIso = start.toISOString();
    const now = new Date();

    const [
      novosClientesRes,
      mensagensRes,
      followupsEnviadosRes,
      followupsRespondidosRes,
      scoreMedioRes,
      crescimentoRes,
      followupSeriesRes,
      emocoesRes,
      categoriasRes,
    ] = await Promise.all([
      // New clients in period
      sb
        .from('clientes')
        .select('id', { count: 'exact' })
        .gte('criado_em', startIso),

      // Messages received in period
      sb
        .from('mensagens')
        .select('id', { count: 'exact' })
        .eq('direcao', 'entrada')
        .gte('criado_em', startIso),

      // Followups sent in period
      sb
        .from('followups')
        .select('id', { count: 'exact' })
        .eq('status', 'enviado')
        .gte('enviado_em', startIso),

      // Followups responded in period
      sb
        .from('followups')
        .select('id', { count: 'exact' })
        .eq('status', 'respondido')
        .gte('atualizado_em', startIso),

      // Average temperatura_lead
      sb.from('clientes').select('temperatura_lead').not('temperatura_lead', 'is', null),

      // Daily client creation series
      sb
        .from('clientes')
        .select('criado_em')
        .gte('criado_em', startIso)
        .order('criado_em', { ascending: true }),

      // Daily followup series
      sb
        .from('followups')
        .select('enviado_em')
        .eq('status', 'enviado')
        .gte('enviado_em', startIso)
        .not('enviado_em', 'is', null)
        .order('enviado_em', { ascending: true }),

      // Top emotions from conversas
      sb
        .from('conversas')
        .select('emocao_detectada')
        .gte('criado_em', startIso)
        .not('emocao_detectada', 'is', null),

      // Top categories from clientes
      sb
        .from('clientes')
        .select('categoria_favorita')
        .not('categoria_favorita', 'is', null),
    ]);

    const novosClientes = novosClientesRes.count ?? 0;
    const mensagensRecebidas = mensagensRes.count ?? 0;
    const followupsEnviados = followupsEnviadosRes.count ?? 0;
    const followupsRespondidos = followupsRespondidosRes.count ?? 0;
    const taxaResposta =
      followupsEnviados > 0 ? (followupsRespondidos / followupsEnviados) * 100 : 0;

    // Average score
    const scores = (scoreMedioRes.data ?? []).map((c: any) => c.temperatura_lead ?? 0);
    const scoresMedio =
      scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

    // Build daily buckets
    const days = getDaysBuckets(start, now);

    const crescimentoByDay: Record<string, number> = {};
    for (const d of days) crescimentoByDay[d] = 0;
    for (const c of crescimentoRes.data ?? []) {
      const day = (c.criado_em as string).slice(0, 10);
      if (day in crescimentoByDay) crescimentoByDay[day]++;
    }
    const crescimentoSeries = days.map((d) => ({ data: d, novosClientes: crescimentoByDay[d] }));

    const followupByDay: Record<string, number> = {};
    for (const d of days) followupByDay[d] = 0;
    for (const f of followupSeriesRes.data ?? []) {
      if (!f.enviado_em) continue;
      const day = (f.enviado_em as string).slice(0, 10);
      if (day in followupByDay) followupByDay[day]++;
    }
    const followupSeries = days.map((d) => ({ data: d, followupsEnviados: followupByDay[d] }));

    // Top emotions
    const emocaoCounts: Record<string, number> = {};
    for (const c of emocoesRes.data ?? []) {
      const e = c.emocao_detectada;
      if (e) emocaoCounts[e] = (emocaoCounts[e] ?? 0) + 1;
    }
    const topEmocoes = Object.entries(emocaoCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emocao, count]) => ({ emocao, count }));

    // Top categories
    const catCounts: Record<string, number> = {};
    for (const c of categoriasRes.data ?? []) {
      const cat = c.categoria_favorita;
      if (cat) catCounts[cat] = (catCounts[cat] ?? 0) + 1;
    }
    const topCategorias = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([categoria, count]) => ({ categoria, count }));

    return NextResponse.json({
      periodo,
      novosClientes,
      mensagensRecebidas,
      followupsEnviados,
      followupsRespondidos,
      taxaResposta,
      scoresMedio,
      crescimentoSeries,
      followupSeries,
      topEmocoes,
      topCategorias,
    });
  } catch (err: any) {
    console.error('Relatorios API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
