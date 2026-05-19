import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: Request) {
  const sb = createServerClient();
  const { searchParams } = new URL(req.url);
  const clienteId = searchParams.get('cliente_id') ?? '';
  const limit = parseInt(searchParams.get('limit') ?? '20');

  // Lista de conversas com último cliente
  const { data: conversas, error } = await sb
    .from('conversas')
    .select(`
      id, status, last_message_at, message_count, handoff_active,
      clientes ( id, name, preferred_name, phone, emotion_profile, tags )
    `)
    .order('last_message_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Se solicitado cliente específico, busca mensagens
  let mensagens: any[] = [];
  if (clienteId) {
    const { data: conv } = await sb
      .from('conversas')
      .select('id')
      .eq('client_id', clienteId)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .single();

    if (conv) {
      const { data: msgs } = await sb
        .from('mensagens')
        .select('id, role, content, emotion_detected, created_at, message_type')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true })
        .limit(100);
      mensagens = msgs ?? [];
    }
  }

  const lista = (conversas ?? []).map((c: any) => {
    const cliente = Array.isArray(c.clientes) ? c.clientes[0] : c.clientes;
    const ep = (cliente?.emotion_profile ?? {}) as Record<string, number>;
    const emocao = Object.entries(ep).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutro';
    return {
      id: c.id,
      clienteId: cliente?.id,
      clienteNome: cliente?.name ?? cliente?.preferred_name ?? cliente?.phone ?? '—',
      clienteTelefone: cliente?.phone ?? '—',
      status: c.status,
      lastMessageAt: c.last_message_at,
      messageCount: c.message_count ?? 0,
      handoffActive: c.handoff_active ?? false,
      emocaoDominante: emocao,
      tags: cliente?.tags ?? [],
    };
  });

  return NextResponse.json({ conversas: lista, mensagens });
}
