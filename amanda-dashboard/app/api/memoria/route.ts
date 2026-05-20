import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const sb = createServerClient();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';
    const clienteId = searchParams.get('cliente_id') ?? '';

    let q = sb
      .from('memoria_longa')
      .select(`
        id, cliente_id, tipo_memoria, conteudo, relevancia, criado_em,
        clientes ( id, nome, nome_preferido, telefone )
      `)
      .order('criado_em', { ascending: false })
      .limit(100);

    if (clienteId) {
      q = q.eq('cliente_id', clienteId);
    }

    if (search) {
      q = q.ilike('conteudo', `%${search}%`);
    }

    const { data, error } = await q;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const memorias = (data ?? []).map((m: any) => {
      const cliente = Array.isArray(m.clientes) ? m.clientes[0] : m.clientes;
      return {
        id: m.id,
        clienteId: m.cliente_id,
        clienteNome: cliente?.nome_preferido ?? cliente?.nome ?? cliente?.telefone ?? '—',
        clienteTelefone: cliente?.telefone ?? '—',
        tipoMemoria: m.tipo_memoria ?? 'geral',
        conteudo: m.conteudo ?? '',
        relevancia: m.relevancia ?? 0,
        criadoEm: m.criado_em,
      };
    });

    // Stats
    const { count: totalMemorias } = await sb
      .from('memoria_longa')
      .select('*', { count: 'exact', head: true });

    const { data: tiposData } = await sb
      .from('memoria_longa')
      .select('tipo_memoria')
      .not('tipo_memoria', 'is', null)
      .limit(500);

    const tiposCount: Record<string, number> = {};
    (tiposData ?? []).forEach((m: any) => {
      const t = m.tipo_memoria;
      if (t) tiposCount[t] = (tiposCount[t] ?? 0) + 1;
    });

    return NextResponse.json({
      memorias,
      total: totalMemorias ?? 0,
      tiposCount,
    });
  } catch (err: any) {
    console.error('Memoria API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
