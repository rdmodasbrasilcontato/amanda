import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limite = parseInt(searchParams.get('limit') ?? '100');
    const tipo = searchParams.get('tipo'); // followup | mensagem | score

    const supabase = createServerClient();

    const [followupLogs, mensagensRecentes, leadScores] = await Promise.all([
      supabase
        .from('followup_logs')
        .select('id, followup_id, cliente_id, mensagem, status, criado_em')
        .order('criado_em', { ascending: false })
        .limit(tipo === 'followup' || !tipo ? 50 : 0),

      supabase
        .from('mensagens')
        .select('id, cliente_id, direcao, tipo, emocao_detectada, criado_em')
        .order('criado_em', { ascending: false })
        .limit(tipo === 'mensagem' || !tipo ? 50 : 0),

      supabase
        .from('lead_scores')
        .select('id, cliente_id, tipo_evento, pontos, score_resultante, criado_em')
        .order('criado_em', { ascending: false })
        .limit(tipo === 'score' || !tipo ? 30 : 0),
    ]);

    const logs: any[] = [];

    (followupLogs.data ?? []).forEach(l => logs.push({
      id: l.id,
      tipo: 'followup',
      nivel: l.status === 'enviado' ? 'success' : l.status === 'falhou' ? 'error' : 'info',
      mensagem: `Follow-up [${l.status}] → ${l.mensagem?.slice(0, 80) ?? '—'}`,
      clienteId: l.cliente_id,
      criadoEm: l.criado_em,
    }));

    (mensagensRecentes.data ?? []).forEach(m => logs.push({
      id: m.id,
      tipo: 'mensagem',
      nivel: m.direcao === 'entrada' ? 'info' : 'success',
      mensagem: `Mensagem [${m.direcao}] tipo ${m.tipo ?? 'texto'}${m.emocao_detectada ? ` · emoção: ${m.emocao_detectada}` : ''}`,
      clienteId: m.cliente_id,
      criadoEm: m.criado_em,
    }));

    (leadScores.data ?? []).forEach(s => logs.push({
      id: s.id,
      tipo: 'score',
      nivel: 'info',
      mensagem: `Lead score +${s.pontos}pts [${s.tipo_evento}] → score ${s.score_resultante}`,
      clienteId: s.cliente_id,
      criadoEm: s.criado_em,
    }));

    logs.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());

    return NextResponse.json({ logs: logs.slice(0, limite) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
