import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const STATUS_MAP: Record<
  string,
  Partial<{
    temperatura_lead: number;
    nivel_engajamento: string;
    etapa_funil: string;
    opt_out: boolean;
  }>
> = {
  novo: { temperatura_lead: 0, nivel_engajamento: 'frio', etapa_funil: 'novo' },
  frio: { temperatura_lead: 10, nivel_engajamento: 'frio', etapa_funil: 'frio' },
  morno: { temperatura_lead: 35, nivel_engajamento: 'morno', etapa_funil: 'morno' },
  quente: { temperatura_lead: 65, nivel_engajamento: 'quente', etapa_funil: 'quente' },
  muito_quente: {
    temperatura_lead: 90,
    nivel_engajamento: 'muito_quente',
    etapa_funil: 'muito_quente',
  },
  vip: { temperatura_lead: 160, nivel_engajamento: 'muito_quente', etapa_funil: 'vip' },
  pausado: { etapa_funil: 'pausado' },
  opt_out: { opt_out: true },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clienteId, novoStatus } = body as {
      clienteId: string;
      novoStatus: string;
    };

    if (!clienteId || !novoStatus) {
      return NextResponse.json(
        { error: 'clienteId e novoStatus são obrigatórios' },
        { status: 400 }
      );
    }

    const updates = STATUS_MAP[novoStatus];
    if (!updates) {
      return NextResponse.json({ error: `Status inválido: ${novoStatus}` }, { status: 400 });
    }

    const sb = createServerClient();

    const { error } = await sb
      .from('clientes')
      .update(updates)
      .eq('id', clienteId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Kanban move API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
