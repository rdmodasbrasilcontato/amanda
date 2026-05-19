import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const sb = createServerClient();
    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get('cliente_id') ?? '';
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const { data: conversas, error } = await sb
      .from('conversas')
      .select(`
        id, status, ultima_mensagem_em, quantidade_mensagens, handoff_ativo,
        emocao_detectada, lead_score, intencao_principal, criado_em,
        clientes ( id, nome, nome_preferido, telefone, emocao_recorrente, nivel_engajamento )
      `)
      .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let mensagens: any[] = [];
    if (clienteId) {
      const { data: conv } = await sb
        .from('conversas')
        .select('id')
        .eq('cliente_id', clienteId)
        .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
        .limit(1)
        .single();

      if (conv) {
        const { data: msgs } = await sb
          .from('mensagens')
          .select('id, direcao, conteudo, emocao_detectada, criado_em, tipo')
          .eq('conversa_id', conv.id)
          .order('criado_em', { ascending: true })
          .limit(100);
        mensagens = (msgs ?? []).map((m: any) => ({
          id: m.id,
          role: m.direcao === 'entrada' ? 'user' : 'assistant',
          content: m.conteudo,
          emotion_detected: m.emocao_detectada,
          created_at: m.criado_em,
          message_type: m.tipo,
        }));
      }
    }

    const lista = (conversas ?? []).map((c: any) => {
      const cliente = Array.isArray(c.clientes) ? c.clientes[0] : c.clientes;
      return {
        id: c.id,
        clienteId: cliente?.id,
        clienteNome: cliente?.nome_preferido ?? cliente?.nome ?? cliente?.telefone ?? '—',
        clienteTelefone: cliente?.telefone ?? '—',
        status: c.status,
        lastMessageAt: c.ultima_mensagem_em,
        messageCount: c.quantidade_mensagens ?? 0,
        handoffActive: c.handoff_ativo ?? false,
        emocaoDominante: c.emocao_detectada ?? cliente?.emocao_recorrente ?? 'neutro',
        leadScore: c.lead_score ?? 0,
        intencao: c.intencao_principal ?? '—',
        tags: cliente?.nivel_engajamento ? [cliente.nivel_engajamento] : [],
      };
    });

    return NextResponse.json({ conversas: lista, mensagens });
  } catch (err: any) {
    console.error('Conversas API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
