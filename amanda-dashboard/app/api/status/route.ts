import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const sb = createServerClient();

    const [
      { count: clientes },
      { count: followupsPendentes },
      { count: conversasAtivas },
      { count: mensagens24h },
    ] = await Promise.all([
      sb.from('clientes').select('*', { count: 'exact', head: true }).eq('opt_out', false),
      sb.from('followups').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
      sb.from('conversas').select('*', { count: 'exact', head: true }).eq('status', 'ativa'),
      sb.from('mensagens')
        .select('*', { count: 'exact', head: true })
        .eq('direcao', 'entrada')
        .gte('criado_em', new Date(Date.now() - 86400000).toISOString()),
    ]);

    return NextResponse.json({
      database: true,
      totalClientes: clientes ?? 0,
      followupsPendentes: followupsPendentes ?? 0,
      conversasAtivas: conversasAtivas ?? 0,
      mensagens24h: mensagens24h ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({
      database: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
}
