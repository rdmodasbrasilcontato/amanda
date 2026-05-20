import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

type MidiaTipo = 'imagem' | 'audio' | 'documento' | 'link';

const VALID_TIPOS: MidiaTipo[] = ['imagem', 'audio', 'documento', 'link'];

export async function GET(req: Request) {
  try {
    const sb = createServerClient();
    const { searchParams } = new URL(req.url);
    const tipoParam = searchParams.get('tipo') as MidiaTipo | null;

    // Stats: count per tipo
    const [imagemRes, audioRes, documentoRes, linkRes, itemsRes] = await Promise.all([
      sb
        .from('mensagens')
        .select('id', { count: 'exact' })
        .eq('tipo', 'imagem'),
      sb
        .from('mensagens')
        .select('id', { count: 'exact' })
        .eq('tipo', 'audio'),
      sb
        .from('mensagens')
        .select('id', { count: 'exact' })
        .eq('tipo', 'documento'),
      sb
        .from('mensagens')
        .select('id', { count: 'exact' })
        .eq('tipo', 'link'),

      // Items with optional tipo filter
      (() => {
        let q = sb
          .from('mensagens')
          .select(`
            id, cliente_id, conteudo, emocao_detectada, tipo, criado_em, direcao,
            clientes ( nome, nome_preferido, telefone )
          `)
          .order('criado_em', { ascending: false })
          .limit(100);

        if (tipoParam && VALID_TIPOS.includes(tipoParam)) {
          q = q.eq('tipo', tipoParam);
        } else {
          // Return non-text types by default
          q = q.in('tipo', VALID_TIPOS);
        }

        return q;
      })(),
    ]);

    if (itemsRes.error) {
      return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });
    }

    const items = (itemsRes.data ?? []).map((m: any) => {
      const cliente = Array.isArray(m.clientes) ? m.clientes[0] : m.clientes;
      return {
        id: m.id,
        clienteId: m.cliente_id,
        clienteNome: cliente?.nome_preferido ?? cliente?.nome ?? cliente?.telefone ?? null,
        clienteTelefone: cliente?.telefone ?? null,
        conteudo: m.conteudo,
        emocaoDetectada: m.emocao_detectada ?? null,
        tipo: m.tipo,
        criadoEm: m.criado_em,
        direcao: m.direcao,
      };
    });

    const stats = {
      imagem: imagemRes.count ?? 0,
      audio: audioRes.count ?? 0,
      documento: documentoRes.count ?? 0,
      link: linkRes.count ?? 0,
    };

    return NextResponse.json({ items, stats });
  } catch (err: any) {
    console.error('Multimodal API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
