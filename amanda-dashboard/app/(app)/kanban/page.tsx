'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus, Snowflake, Flame, Zap, Star, Crown, PauseCircle, XCircle,
  RefreshCw, GripVertical,
} from 'lucide-react';
import {
  DndContext, DragOverlay, useSensor, useSensors, PointerSensor,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn, initials, timeAgo } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  emocao_recorrente: string;
  temperatura_lead: number;
  nivel_engajamento: number;
  ultima_interacao: string;
  etapa_funil: string;
  categoria_favorita: string;
  lead_score: number;
  comportamento_dominante: string;
  probabilidade_compra: number;
  ticket_medio: number;
}

type ColumnKey = 'novo' | 'frio' | 'morno' | 'quente' | 'muito_quente' | 'vip' | 'pausado' | 'opt_out';

interface KanbanData {
  columns: Record<ColumnKey, Cliente[]>;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const EMOCAO_EMOJI: Record<string, string> = {
  animado: '😄', curioso: '🤔', indeciso: '😐', frustrado: '😠',
  satisfeito: '😊', urgente: '🚨', neutro: '😶', ansioso: '😰',
  feliz: '😁', triste: '😢',
};

const EMOCAO_COLOR: Record<string, string> = {
  animado: 'success', curioso: 'info', indeciso: 'warning',
  frustrado: 'destructive', satisfeito: 'success', urgente: 'destructive',
  neutro: 'outline', ansioso: 'warning', feliz: 'success', triste: 'info',
};

const COLUMN_CONFIG: Record<ColumnKey, {
  label: string;
  Icon: React.ElementType;
  accent: string;
  headerBg: string;
}> = {
  novo:         { label: 'Novo',         Icon: UserPlus,    accent: 'text-slate-400',   headerBg: 'bg-slate-500/10 border-slate-500/30' },
  frio:         { label: 'Frio',         Icon: Snowflake,   accent: 'text-blue-400',    headerBg: 'bg-blue-500/10 border-blue-500/30' },
  morno:        { label: 'Morno',        Icon: Flame,       accent: 'text-orange-400',  headerBg: 'bg-orange-500/10 border-orange-500/30' },
  quente:       { label: 'Quente',       Icon: Zap,         accent: 'text-red-400',     headerBg: 'bg-red-500/10 border-red-500/30' },
  muito_quente: { label: 'Muito Quente', Icon: Star,        accent: 'text-fuchsia-400', headerBg: 'bg-fuchsia-500/10 border-fuchsia-500/30' },
  vip:          { label: 'VIP',          Icon: Crown,       accent: 'text-yellow-400',  headerBg: 'bg-yellow-500/10 border-yellow-500/30' },
  pausado:      { label: 'Pausado',      Icon: PauseCircle, accent: 'text-slate-400',   headerBg: 'bg-slate-500/10 border-slate-500/30' },
  opt_out:      { label: 'Opt-out',      Icon: XCircle,     accent: 'text-red-500',     headerBg: 'bg-red-500/10 border-red-500/30' },
};

const COLUMN_ORDER: ColumnKey[] = ['novo', 'frio', 'morno', 'quente', 'muito_quente', 'vip', 'pausado', 'opt_out'];

// ─── Temperature Badge ────────────────────────────────────────────────────────
function TempBadge({ score }: { score: number }) {
  if (score >= 81) return <Badge variant="destructive">🔥 Muito Quente</Badge>;
  if (score >= 51) return <Badge variant="warning">⚡ Quente</Badge>;
  if (score >= 21) return <Badge variant="info">🌡️ Morno</Badge>;
  return <Badge variant="outline">❄️ Frio</Badge>;
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanCard({ cliente, isDragging }: { cliente: Cliente; isDragging?: boolean }) {
  const emocaoEmoji = EMOCAO_EMOJI[cliente.emocao_recorrente] ?? '😶';
  const emocaoColor = (EMOCAO_COLOR[cliente.emocao_recorrente] ?? 'outline') as any;
  const scorePercent = Math.min((cliente.lead_score / 200) * 100, 100);

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-white/5 backdrop-blur-sm p-3 space-y-3 select-none',
        isDragging && 'opacity-50 ring-2 ring-primary/50',
      )}
    >
      <div className="flex items-start gap-2">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-[10px]">{initials(cliente.nome)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{cliente.nome}</div>
          <div className="text-xs text-muted-foreground">{cliente.telefone}</div>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      </div>

      <div className="flex flex-wrap gap-1">
        <TempBadge score={cliente.temperatura_lead} />
        <Badge variant={emocaoColor} className="text-xs">
          {emocaoEmoji} {cliente.emocao_recorrente}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Lead Score</span>
          <span className="font-medium text-foreground">{cliente.lead_score}</span>
        </div>
        <Progress value={scorePercent} className="h-1.5" />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border">
        <span>{timeAgo(cliente.ultima_interacao)}</span>
        <span className="font-medium text-success">{cliente.probabilidade_compra}% compra</span>
      </div>
    </div>
  );
}

// ─── Sortable Card Wrapper ────────────────────────────────────────────────────
function SortableCard({ cliente }: { cliente: Cliente }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cliente.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <KanbanCard cliente={cliente} isDragging={isDragging} />
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────
function KanbanColumn({ colKey, clientes }: { colKey: ColumnKey; clientes: Cliente[] }) {
  const { Icon, label, accent, headerBg } = COLUMN_CONFIG[colKey];

  return (
    <div className="flex flex-col w-72 shrink-0 rounded-2xl border border-border bg-white/5 backdrop-blur-sm overflow-hidden">
      <div className={cn('flex items-center gap-2 px-3 py-3 border-b border-border', headerBg)}>
        <Icon className={cn('h-4 w-4', accent)} />
        <span className="text-sm font-semibold flex-1">{label}</span>
        <Badge variant="outline" className="text-xs tabular-nums">{clientes.length}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-280px)]">
        <SortableContext items={clientes.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {clientes.map(c => <SortableCard key={c.id} cliente={c} />)}
        </SortableContext>
        {clientes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Icon className={cn('h-8 w-8 mb-2 opacity-30', accent)} />
            <p className="text-xs">Sem clientes</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function KanbanPage() {
  const [data, setData] = useState<KanbanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCliente, setActiveCliente] = useState<Cliente | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/kanban');
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message ?? 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const findColumnForCard = useCallback((cardId: string): ColumnKey | null => {
    if (!data) return null;
    for (const colKey of COLUMN_ORDER) {
      if (data.columns[colKey]?.find(c => c.id === cardId)) return colKey;
    }
    return null;
  }, [data]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (!data) return;
    const id = String(event.active.id);
    for (const colKey of COLUMN_ORDER) {
      const found = data.columns[colKey]?.find(c => c.id === id);
      if (found) { setActiveCliente(found); return; }
    }
  }, [data]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveCliente(null);
    const { active, over } = event;
    if (!over || !data) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const sourceCol = findColumnForCard(activeId);
    const destCol: ColumnKey | null = COLUMN_ORDER.includes(overId as ColumnKey)
      ? (overId as ColumnKey)
      : findColumnForCard(overId);

    if (!sourceCol || !destCol || sourceCol === destCol) return;

    // Optimistic update
    setData(prev => {
      if (!prev) return prev;
      const moved = prev.columns[sourceCol].find(c => c.id === activeId);
      if (!moved) return prev;
      return {
        columns: {
          ...prev.columns,
          [sourceCol]: prev.columns[sourceCol].filter(c => c.id !== activeId),
          [destCol]: [...(prev.columns[destCol] ?? []), moved],
        },
      };
    });

    try {
      await fetch('/api/kanban/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId: activeId, novoStatus: destCol }),
      });
    } catch {
      fetchData();
    }
  }, [data, findColumnForCard, fetchData]);

  const totalClientes = data
    ? COLUMN_ORDER.reduce((sum, k) => sum + (data.columns[k]?.length ?? 0), 0)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kanban CRM"
        description="Visualize e gerencie clientes por estágio do funil"
        actions={
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Atualizar
          </Button>
        }
      />

      {/* Summary badges */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2"
        >
          <Badge variant="default" className="px-3 py-1">
            Total: {totalClientes} clientes
          </Badge>
          {COLUMN_ORDER.map(colKey => {
            const count = data.columns[colKey]?.length ?? 0;
            const { label, accent } = COLUMN_CONFIG[colKey];
            return count > 0 ? (
              <Badge key={colKey} variant="outline" className={cn('px-3 py-1', accent)}>
                {label}: {count}
              </Badge>
            ) : null;
          })}
        </motion.div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMN_ORDER.map(key => (
            <div key={key} className="w-72 shrink-0 rounded-2xl border border-border bg-white/5 backdrop-blur-sm p-3 space-y-3">
              <div className="h-8 rounded-lg bg-white/10 animate-pulse" />
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center max-w-sm">
            <p className="text-destructive font-semibold mb-2">Erro ao carregar o Kanban</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {/* Board */}
      {data && !loading && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex gap-4 overflow-x-auto pb-4"
          >
            {COLUMN_ORDER.map(colKey => (
              <KanbanColumn
                key={colKey}
                colKey={colKey}
                clientes={data.columns[colKey] ?? []}
              />
            ))}
          </motion.div>
          <DragOverlay>
            {activeCliente && <KanbanCard cliente={activeCliente} />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
