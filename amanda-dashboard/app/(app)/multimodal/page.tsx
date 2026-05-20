'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Image as ImageIcon, Mic, FileText, Link as LinkIcon, RefreshCw,
} from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn, timeAgo } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MultimodalItem {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string;
  conteudo: string;
  emocaoDetectada: string;
  tipo: string;
  criadoEm: string;
  direcao: string;
}

interface MultimodalData {
  items: MultimodalItem[];
  stats: {
    imagem: number;
    audio: number;
    documento: number;
    link: number;
  };
}

type TipoMedia = 'imagem' | 'audio' | 'documento' | 'link';

// ─── Constants ────────────────────────────────────────────────────────────────
const EMOCAO_EMOJI: Record<string, string> = {
  animado: '😄', curioso: '🤔', indeciso: '😐', frustrado: '😠',
  satisfeito: '😊', urgente: '🚨', neutro: '😶', ansioso: '😰',
  feliz: '😁', triste: '😢',
};

const EMOCAO_COLOR: Record<string, 'success' | 'info' | 'warning' | 'destructive' | 'outline'> = {
  animado: 'success', curioso: 'info', indeciso: 'warning',
  frustrado: 'destructive', satisfeito: 'success', urgente: 'destructive',
  neutro: 'outline', ansioso: 'warning', feliz: 'success', triste: 'info',
};

const TAB_CONFIG: { id: TipoMedia; label: string; Icon: React.ElementType; apiParam: string; accent: string }[] = [
  { id: 'imagem',    label: 'Imagens',    Icon: ImageIcon, apiParam: 'imagem',    accent: 'text-primary' },
  { id: 'audio',     label: 'Áudios',     Icon: Mic,       apiParam: 'audio',     accent: 'text-success' },
  { id: 'documento', label: 'Documentos', Icon: FileText,  apiParam: 'documento', accent: 'text-warning' },
  { id: 'link',      label: 'Links',      Icon: LinkIcon,  apiParam: 'link',      accent: 'text-info' },
];

// ─── Media Grid ───────────────────────────────────────────────────────────────
function MediaGrid({ tipo }: { tipo: TipoMedia }) {
  const [items, setItems] = useState<MultimodalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = TAB_CONFIG.find(t => t.id === tipo)!;
  const { Icon, accent } = config;

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/multimodal?tipo=${tipo}`);
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const json: MultimodalData = await res.json();
      setItems(json.items ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [tipo]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 mt-4">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center max-w-sm">
          <p className="text-destructive font-semibold mb-2">Erro ao carregar</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchItems}>
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground mt-4">
        <Icon className={cn('h-12 w-12 mb-3 opacity-30', accent)} />
        <p className="text-sm font-medium">Nenhum item encontrado</p>
        <p className="text-xs mt-1">Os itens aparecerão aqui quando forem recebidos</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      {items.map((item, i) => {
        const emocao = item.emocaoDetectada?.toLowerCase() ?? 'neutro';
        const emocaoEmoji = EMOCAO_EMOJI[emocao] ?? '😶';
        const emocaoColor = EMOCAO_COLOR[emocao] ?? 'outline';

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl border border-border bg-white/5 backdrop-blur-sm overflow-hidden hover:border-primary/30 transition-colors"
          >
            {/* Icon header */}
            <div className="flex items-center justify-center h-24 bg-gradient-to-br from-primary/5 via-transparent to-fuchsia-500/5 border-b border-border">
              <Icon className={cn('h-10 w-10 opacity-40', accent)} />
            </div>

            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{item.clienteNome}</div>
                  <div className="text-xs text-muted-foreground">{item.clienteTelefone}</div>
                </div>
                <Badge variant={emocaoColor as any} className="text-xs shrink-0">
                  {emocaoEmoji} {emocao}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">
                {item.conteudo || '—'}
              </p>

              <div className="flex items-center justify-between pt-1 border-t border-border">
                <Badge variant="outline" className="text-[10px] capitalize">
                  {item.direcao === 'inbound' ? '↓ Recebido' : '↑ Enviado'}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {timeAgo(item.criadoEm)}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MultimodalPage() {
  const [stats, setStats] = useState<MultimodalData['stats'] | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await fetch('/api/multimodal?tipo=imagem');
      if (!res.ok) return;
      const json: MultimodalData = await res.json();
      if (json.stats) setStats(json.stats);
    } catch {
      // Stats are optional
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const statCards = [
    { label: 'Imagens',    key: 'imagem'    as const, Icon: ImageIcon, accent: 'text-primary' },
    { label: 'Áudios',     key: 'audio'     as const, Icon: Mic,       accent: 'text-success' },
    { label: 'Documentos', key: 'documento' as const, Icon: FileText,  accent: 'text-warning' },
    { label: 'Links',      key: 'link'      as const, Icon: LinkIcon,  accent: 'text-info' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Multimodal"
        description="Análise de imagens, áudios, documentos e links recebidos de clientes"
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s, i) => {
          const Icon = s.Icon;
          const value = stats?.[s.key] ?? 0;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-white/5 backdrop-blur-sm p-4 text-center"
            >
              {statsLoading ? (
                <div className="space-y-2">
                  <div className="h-6 w-6 rounded-full bg-white/10 animate-pulse mx-auto" />
                  <div className="h-7 rounded bg-white/10 animate-pulse" />
                  <div className="h-3 rounded bg-white/5 animate-pulse" />
                </div>
              ) : (
                <>
                  <Icon className={cn('h-5 w-5 mx-auto mb-2', s.accent)} />
                  <div className="text-2xl font-bold tabular-nums">{value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="imagem">
        <TabsList>
          {TAB_CONFIG.map(t => (
            <TabsTrigger key={t.id} value={t.id}>
              <t.Icon className={cn('h-3.5 w-3.5 mr-1.5', t.accent)} />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_CONFIG.map(t => (
          <TabsContent key={t.id} value={t.id}>
            <MediaGrid tipo={t.id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
