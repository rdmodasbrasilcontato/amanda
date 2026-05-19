import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  const sb = createServerClient();

  // Top categorias citadas
  const { data: categorias } = await sb
    .from('customer_behavior_profile')
    .select('categoria_favorita')
    .not('categoria_favorita', 'is', null)
    .limit(500);

  const catCount: Record<string, number> = {};
  (categorias ?? []).forEach((r: any) => {
    const cat = r.categoria_favorita;
    if (cat) catCount[cat] = (catCount[cat] ?? 0) + 1;
  });
  const topCategorias = Object.entries(catCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  // Distribuição de intenção dominante
  const { data: intencoes } = await sb
    .from('customer_behavior_profile')
    .select('intencao_dominante')
    .not('intencao_dominante', 'is', null)
    .limit(500);

  const intCount: Record<string, number> = {};
  (intencoes ?? []).forEach((r: any) => {
    const i = r.intencao_dominante;
    if (i) intCount[i] = (intCount[i] ?? 0) + 1;
  });
  const intentionPie = Object.entries(intCount)
    .map(([name, value]) => ({ name, value }));

  // Distribuição de comportamento dominante
  const { data: comportamentos } = await sb
    .from('customer_behavior_profile')
    .select('comportamento_dominante')
    .not('comportamento_dominante', 'is', null)
    .limit(500);

  const compCount: Record<string, number> = {};
  (comportamentos ?? []).forEach((r: any) => {
    const c = r.comportamento_dominante;
    if (c) compCount[c] = (compCount[c] ?? 0) + 1;
  });
  const behaviorPie = Object.entries(compCount)
    .map(([name, value]) => ({ name, value }));

  // Atividade por hora (mensagens)
  const { data: hourlyData } = await sb
    .from('mensagens')
    .select('created_at')
    .eq('role', 'user')
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
    .limit(5000);

  const hourCount = Array.from({ length: 24 }, (_, h) => ({ hora: `${String(h).padStart(2, '0')}h`, mensagens: 0 }));
  (hourlyData ?? []).forEach((m: any) => {
    const h = new Date(m.created_at).getHours();
    hourCount[h].mensagens++;
  });

  // Emoções recentes (scatter: score_emocional vs probabilidade_compra)
  const { data: scatterData } = await sb
    .from('customer_behavior_profile')
    .select('score_emocional, probabilidade_compra, lead_score, intencao_dominante')
    .not('score_emocional', 'is', null)
    .not('probabilidade_compra', 'is', null)
    .limit(200);

  const emotionScatter = (scatterData ?? []).map((r: any) => ({
    x: r.score_emocional ?? 0,
    y: r.probabilidade_compra ?? 0,
    z: r.lead_score ?? 30,
    label: r.intencao_dominante ?? 'pesquisa',
  }));

  return NextResponse.json({
    topCategorias,
    intentionPie,
    behaviorPie,
    hourlyActivity: hourCount,
    emotionScatter,
  });
}
