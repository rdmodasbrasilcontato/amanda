import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const sb = createServerClient();

    const [
      { count: totalClientes },
      { count: totalMensagens },
      { count: totalFollowups },
      { count: followupsEnviados },
      { count: clientesQuentes },
      { count: clientesMornos },
      { count: clientesFrios },
    ] = await Promise.all([
      sb.from('clientes').select('*', { count: 'exact', head: true }).eq('opt_out', false),
      sb.from('mensagens').select('*', { count: 'exact', head: true }),
      sb.from('followups').select('*', { count: 'exact', head: true }),
      sb.from('followups').select('*', { count: 'exact', head: true }).eq('status', 'enviado'),
      sb.from('clientes').select('*', { count: 'exact', head: true }).gte('temperatura_lead', 51).eq('opt_out', false),
      sb.from('clientes').select('*', { count: 'exact', head: true }).gte('temperatura_lead', 21).lt('temperatura_lead', 51).eq('opt_out', false),
      sb.from('clientes').select('*', { count: 'exact', head: true }).lt('temperatura_lead', 21).eq('opt_out', false),
    ]);

    // Crescimento últimos 30 dias
    const { data: crescimento } = await sb
      .from('clientes')
      .select('criado_em')
      .gte('criado_em', new Date(Date.now() - 30 * 86400000).toISOString())
      .order('criado_em');

    // Emoções dos clientes
    const { data: emocoesData } = await sb
      .from('clientes')
      .select('emocao_recorrente')
      .not('emocao_recorrente', 'is', null)
      .limit(500);

    // Mensagens recentes para gráfico
    const { data: mensagensRecentes } = await sb
      .from('mensagens')
      .select('criado_em, emocao_detectada')
      .gte('criado_em', new Date(Date.now() - 30 * 86400000).toISOString())
      .order('criado_em');

    // Agrupar por dia
    const growthByDay: Record<string, { clientes: number; mensagens: number }> = {};
    const days30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 86400000);
      return d.toISOString().slice(5, 10);
    });
    days30.forEach(d => { growthByDay[d] = { clientes: 0, mensagens: 0 }; });

    crescimento?.forEach(c => {
      const day = new Date(c.criado_em).toISOString().slice(5, 10);
      if (growthByDay[day]) growthByDay[day].clientes++;
    });
    mensagensRecentes?.forEach(m => {
      const day = new Date(m.criado_em).toISOString().slice(5, 10);
      if (growthByDay[day]) growthByDay[day].mensagens++;
    });

    const growthSeries = days30.map(d => ({ date: d, ...growthByDay[d] }));

    // Agregar emoções
    const emotionCount: Record<string, number> = {};
    emocoesData?.forEach(c => {
      const emocao = c.emocao_recorrente;
      if (emocao) emotionCount[emocao] = (emotionCount[emocao] ?? 0) + 1;
    });

    const taxaResposta = totalFollowups
      ? Math.round(((followupsEnviados ?? 0) / (totalFollowups ?? 1)) * 100)
      : 0;

    return NextResponse.json({
      kpis: {
        totalClientes: totalClientes ?? 0,
        totalMensagens: totalMensagens ?? 0,
        totalFollowups: totalFollowups ?? 0,
        taxaResposta,
        clientesQuentes: clientesQuentes ?? 0,
        clientesMornos: clientesMornos ?? 0,
        clientesFrios: clientesFrios ?? 0,
      },
      growthSeries,
      emotionCount,
    });
  } catch (err: any) {
    console.error('Dashboard API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
