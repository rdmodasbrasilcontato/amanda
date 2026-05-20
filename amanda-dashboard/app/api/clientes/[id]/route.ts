import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const sb = createServerClient();
    const { id } = params;

    const { data, error } = await sb
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      id: data.id,
      nome: data.nome_preferido ?? data.nome ?? data.telefone,
      telefone: data.telefone,
      email: data.email ?? null,
      cidade: data.cidade ?? null,
      estado: data.estado ?? null,
      emocaoRecorrente: data.emocao_recorrente ?? 'neutro',
      nivelEngajamento: data.nivel_engajamento ?? null,
      temperaturaLead: data.temperatura_lead ?? 0,
      etapaFunil: data.etapa_funil ?? null,
      ultimaInteracao: data.ultima_interacao ?? null,
      criadoEm: data.criado_em,
      optOut: data.opt_out ?? false,
      bloqueado: data.bloqueado ?? false,
    });
  } catch (err: any) {
    console.error('Cliente detail API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
