import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: Request) {
  const sb = createServerClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '50');

  let query = sb
    .from('followups')
    .select(`
      id, tipo, etapa, mensagem, mensagem_gerada, status,
      respondido, agendado_para, enviado_em, created_at,
      clientes ( id, name, preferred_name, phone )
    `, { count: 'exact' })
    .order('agendado_para', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const followups = (data ?? []).map((f: any) => {
    const cliente = Array.isArray(f.clientes) ? f.clientes[0] : f.clientes;
    return {
      id: f.id,
      clienteNome: cliente?.name ?? cliente?.preferred_name ?? cliente?.phone ?? '—',
      clienteTelefone: cliente?.phone ?? '—',
      clienteId: cliente?.id,
      tipo: f.tipo ?? '—',
      etapa: f.etapa ?? '—',
      mensagem: f.mensagem_gerada ?? f.mensagem ?? '—',
      status: f.status ?? 'pendente',
      respondido: f.respondido ?? false,
      agendadoPara: f.agendado_para,
      enviadoEm: f.enviado_em,
      criadoEm: f.created_at,
    };
  });

  const { count: agendados } = await sb.from('followups').select('*', { count: 'exact', head: true }).eq('status', 'pendente');
  const { count: enviados } = await sb.from('followups').select('*', { count: 'exact', head: true }).eq('status', 'enviado');
  const { count: respondidos } = await sb.from('followups').select('*', { count: 'exact', head: true }).eq('respondido', true);
  const { count: cancelados } = await sb.from('followups').select('*', { count: 'exact', head: true }).eq('status', 'cancelado');

  return NextResponse.json({
    followups,
    total: count ?? 0,
    page,
    limit,
    stats: {
      agendados: agendados ?? 0,
      enviados: enviados ?? 0,
      respondidos: respondidos ?? 0,
      cancelados: cancelados ?? 0,
    },
  });
}
