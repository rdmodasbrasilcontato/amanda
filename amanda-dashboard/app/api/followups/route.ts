import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const sb = createServerClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? '';
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '50');

    let q = sb
      .from('followups')
      .select(`
        id, tipo, etapa, mensagem_gerada, status,
        agendado_para, enviado_em, tentativas, criado_em,
        clientes ( id, nome, nome_preferido, telefone )
      `, { count: 'exact' })
      .order('agendado_para', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) {
      q = q.eq('status', status);
    }

    const { data, error, count } = await q;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const followups = (data ?? []).map((f: any) => {
      const cliente = Array.isArray(f.clientes) ? f.clientes[0] : f.clientes;
      return {
        id: f.id,
        clienteNome: cliente?.nome_preferido ?? cliente?.nome ?? cliente?.telefone ?? '—',
        clienteTelefone: cliente?.telefone ?? '—',
        clienteId: cliente?.id,
        tipo: f.tipo ?? 'reativacao',
        etapa: f.etapa ?? '—',
        mensagem: f.mensagem_gerada ?? '—',
        status: f.status ?? 'pendente',
        tentativas: f.tentativas ?? 0,
        agendadoPara: f.agendado_para,
        enviadoEm: f.enviado_em,
        criadoEm: f.criado_em,
      };
    });

    const [
      { count: agendados },
      { count: enviados },
      { count: cancelados },
      { count: falhou },
    ] = await Promise.all([
      sb.from('followups').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
      sb.from('followups').select('*', { count: 'exact', head: true }).eq('status', 'enviado'),
      sb.from('followups').select('*', { count: 'exact', head: true }).eq('status', 'cancelado'),
      sb.from('followups').select('*', { count: 'exact', head: true }).eq('status', 'falhou'),
    ]);

    return NextResponse.json({
      followups,
      total: count ?? 0,
      page,
      limit,
      stats: {
        agendados: agendados ?? 0,
        enviados: enviados ?? 0,
        respondidos: 0,
        cancelados: cancelados ?? 0,
        falhou: falhou ?? 0,
      },
    });
  } catch (err: any) {
    console.error('Followups API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
