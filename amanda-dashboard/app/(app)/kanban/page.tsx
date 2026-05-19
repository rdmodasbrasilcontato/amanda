'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, MoreHorizontal, Flame, Thermometer, Snowflake, Star, Clock, UserCheck, UserX, Pause } from 'lucide-react';
import { clients, type Client, type ClientStatus } from '@/lib/mock-data';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn, timeAgo } from '@/lib/utils';

interface Column {
  id: ClientStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
  accent: string;
}

const COLUMNS: Column[] = [
  { id: 'novo',       label: 'Novos Leads',         icon: <Plus className="h-4 w-4" />,         color: 'text-primary',   accent: 'bg-primary/10 border-primary/20' },
  { id: 'aguardando', label: 'Aguardando',          icon: <Clock className="h-4 w-4" />,        color: 'text-warning',   accent: 'bg-warning/10 border-warning/20' },
  { id: 'frio',       label: 'Frios',               icon: <Snowflake className="h-4 w-4" />,    color: 'text-cold',      accent: 'bg-cold/10 border-cold/20' },
  { id: 'morno',      label: 'Mornos',              icon: <Thermometer className="h-4 w-4" />, color: 'text-warm',      accent: 'bg-warm/10 border-warm/20' },
  { id: 'quente',     label: 'Quentes',             icon: <Flame className="h-4 w-4" />,        color: 'text-hot',       accent: 'bg-hot/10 border-hot/20' },
  { id: 'ativo',      label: 'Ativos',              icon: <UserCheck className="h-4 w-4" />,   color: 'text-success',   accent: 'bg-success/10 border-success/20' },
  { id: 'pos-venda',  label: 'Pós-venda',           icon: <Star className="h-4 w-4" />,         color: 'text-info',      accent: 'bg-info/10 border-info/20' },
  { id: 'vip',        label: 'VIP',                 icon: <Star className="h-4 w-4" />,         color: 'text-primary',   accent: 'bg-primary/15 border-primary/30' },
  { id: 'pausado',    label: 'Pausados',            icon: <Pause className="h-4 w-4" />,        color: 'text-muted-foreground', accent: 'bg-muted border-border' },
  { id: 'encerrado',  label: 'Encerrados',          icon: <UserX className="h-4 w-4" />,        color: 'text-destructive', accent: 'bg-destructive/10 border-destructive/20' },
];

const emotionEmoji: Record<string, string> = {
  animado: '😊', curioso: '🤔', indeciso: '😕', frustrado: '😠',
  satisfeito: '😌', urgente: '⚡', neutro: '😐',
};

function KanbanCard({ client }: { client: Client }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group rounded-xl border border-border bg-card/80 backdrop-blur-sm p-3 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-500/20 text-xs font-semibold">
            {client.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate max-w-[100px]">{client.nome.split(' ')[0]}</div>
            <div className="text-[10px] text-muted-foreground">{client.cidade}</div>
          </div>
        </div>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent">
          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        <Badge variant="secondary" className="text-[9px] h-4 px-1">{client.categoriaFavorita}</Badge>
        <span className="text-[11px]">{emotionEmoji[client.emocaoDominante]}</span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Score</span>
          <span className="font-medium tabular-nums">{client.leadScore}</span>
        </div>
        <Progress value={client.leadScore} className="h-1" />
      </div>

      <div className="mt-2 text-[10px] text-muted-foreground">{timeAgo(client.ultimaInteracao)}</div>
    </motion.div>
  );
}

export default function KanbanPage() {
  const [board, setBoard] = useState<Record<ClientStatus, Client[]>>(() => {
    const map = {} as Record<ClientStatus, Client[]>;
    COLUMNS.forEach(col => { map[col.id] = []; });
    clients.forEach(c => {
      if (map[c.status]) map[c.status].push(c);
    });
    return map;
  });

  return (
    <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col">
      <PageHeader
        title="Kanban CRM"
        description="Visualize e gerencie clientes por estágio"
        actions={<Button variant="glow" size="sm"><Plus className="h-3.5 w-3.5" /> Novo Lead</Button>}
      />

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
        {COLUMNS.map(col => {
          const cards = board[col.id];
          return (
            <div key={col.id} className="flex-none w-56 flex flex-col">
              {/* Column header */}
              <div className={cn('flex items-center justify-between rounded-lg border p-2.5 mb-2', col.accent)}>
                <div className={cn('flex items-center gap-1.5 text-xs font-semibold', col.color)}>
                  {col.icon}
                  {col.label}
                </div>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{cards.length}</Badge>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                {cards.map(c => <KanbanCard key={c.id} client={c} />)}
                {cards.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Nenhum cliente
                  </div>
                )}
              </div>

              {/* Add button */}
              <button className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-border p-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
