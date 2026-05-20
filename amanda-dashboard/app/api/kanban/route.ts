import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export interface KanbanCliente {
  id: string;
  nome: string;
  telefone: string;
  emocao_recorrente: string | null;
  temperatura_lead: number;
  nivel_engajamento: string | null;
  ultima_interacao: string | null;
  etapa_funil: string | null;
  categoria_favorita: string | null;
  lead_score: number | null;
  comportamento_dominante: string | null;
  probabilidade_compra: number | null;
  ticket_medio: number | null;
}

type KanbanColumn =
  | 'novo'
  | 'frio'
  | 'morno'
  | 'quente'
  | 'muito_quente'
  | 'vip'
  | 'pausado'
  | 'opt_out';

function getColumn(c: any): KanbanColumn {
  if (c.opt_out) return 'opt_out';
  if (
    c.etapa_funil === 'vip' ||
    (c.nivel_engajamento === 'muito_quente' && (c.temperatura_lead ?? 0) >= 150)
  )
    return 'vip';
  if (c.etapa_funil === 'pausado') return 'pausado';
  const temp = c.temperatura_lead ?? 0;
  if (temp >= 81) return 'muito_quente';
  if (temp >= 51) return 'quente';
  if (temp >= 21) return 'morno';
  if (temp > 0) return 'frio';
  return 'novo';
}

export async function GET() {
  try {
    const sb = createServerClient();

    const { data, error } = await sb
      .from('clientes')
      .select(`
        id, telefone, nome, nome_preferido, opt_out, emocao_recorrente,
        temperatura_lead, nivel_engajamento, ultima_interacao, etapa_funil,
        categoria_favorita, ticket_medio,
        customer_behavior_profile (
          lead_score, comportamento_dominante, probabilidade_compra
        )
      `)
      .eq('bloqueado', false)
      .order('temperatura_lead', { ascending: false, nullsFirst: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const columns: Record<KanbanColumn, KanbanCliente[]> = {
      novo: [],
      frio: [],
      morno: [],
      quente: [],
      muito_quente: [],
      vip: [],
      pausado: [],
      opt_out: [],
    };

    const columnCounts: Record<KanbanColumn, number> = {
      novo: 0,
      frio: 0,
      morno: 0,
      quente: 0,
      muito_quente: 0,
      vip: 0,
      pausado: 0,
      opt_out: 0,
    };

    for (const c of data ?? []) {
      const col = getColumn(c);
      if (columnCounts[col] >= 50) continue;

      const bp = Array.isArray(c.customer_behavior_profile)
        ? c.customer_behavior_profile[0]
        : c.customer_behavior_profile;

      columns[col].push({
        id: c.id,
        nome: c.nome_preferido ?? c.nome ?? c.telefone,
        telefone: c.telefone,
        emocao_recorrente: c.emocao_recorrente ?? null,
        temperatura_lead: c.temperatura_lead ?? 0,
        nivel_engajamento: c.nivel_engajamento ?? null,
        ultima_interacao: c.ultima_interacao ?? null,
        etapa_funil: c.etapa_funil ?? null,
        categoria_favorita: bp?.categoria_favorita ?? c.categoria_favorita ?? null,
        lead_score: bp?.lead_score ?? null,
        comportamento_dominante: bp?.comportamento_dominante ?? null,
        probabilidade_compra: bp?.probabilidade_compra ?? null,
        ticket_medio: c.ticket_medio ?? null,
      });

      columnCounts[col]++;
    }

    return NextResponse.json({ columns });
  } catch (err: any) {
    console.error('Kanban API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
