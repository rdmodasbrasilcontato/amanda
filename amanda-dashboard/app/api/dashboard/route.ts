import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  const sb = createServerClient();

  const [
    { count: totalClientes },
    { count: totalMensagens },
    { count: totalFollowups },
    { count: followupsRespondidos },
    { count: clientesQuentes },
    { count: clientesMornos },
    { count: clientesFrios },
  ] = await Promise.all([
    sb.from('clientes').select('*', { count: 'exact', head: true }).eq('opt_out', false),
    sb.from('mensagens').select('*', { count: 'exact', head: true }),
    sb.from('followups').select('*', { count: 'exact', head: true }),
    sb.from('followups').select('*', { count: 'exact', head: true }).eq('respondido', true),
    sb.from('clientes').select('*', { count: 'exact', head: true }).contains('tags', ['quente']),
    sb.from('clientes').select('*', { count: 'exact', head: true }).contains('tags', ['morno']),
    sb.from('clientes').select('*', { count: 'exact', head: true }).contains('tags', ['frio']),
  ]);

  // Crescimento últimos 30 dias
  const { data: crescimento } = await sb
    .from('clientes')
    .select('created_at')
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
    .order('created_at');

  // Emoções dos clientes
  const { data: emocoesData } = await sb
    .from('clientes')
    .select('emotion_profile')
    .not('emotion_profile', 'eq', '{}')
    .limit(200);

  // Últimas mensagens para gráfico
  const { data: mensagensRecentes } = await sb
    .from('mensagens')
    .select('created_at, emotion_detected')
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
    .order('created_at');

  // Agrupar crescimento por dia
  const growthByDay: Record<string, { clientes: number; mensagens: number }> = {};
  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    return d.toISOString().slice(5, 10);
  });
  days30.forEach(d => { growthByDay[d] = { clientes: 0, mensagens: 0 }; });

  crescimento?.forEach(c => {
    const day = new Date(c.created_at).toISOString().slice(5, 10);
    if (growthByDay[day]) growthByDay[day].clientes++;
  });
  mensagensRecentes?.forEach(m => {
    const day = new Date(m.created_at).toISOString().slice(5, 10);
    if (growthByDay[day]) growthByDay[day].mensagens++;
  });

  const growthSeries = days30.map(d => ({ date: d, ...growthByDay[d] }));

  // Agregar emoções
  const emotionCount: Record<string, number> = {};
  emocoesData?.forEach(c => {
    const ep = c.emotion_profile as Record<string, number>;
    if (ep && typeof ep === 'object') {
      const dominant = Object.entries(ep).sort((a, b) => b[1] - a[1])[0];
      if (dominant) {
        emotionCount[dominant[0]] = (emotionCount[dominant[0]] ?? 0) + 1;
      }
    }
  });

  const taxaResposta = totalFollowups
    ? Math.round(((followupsRespondidos ?? 0) / (totalFollowups ?? 1)) * 100)
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
}
