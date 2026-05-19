'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Clock, CheckCircle2, XCircle, MessageSquare, TrendingUp, Filter, Plus } from 'lucide-react';
import { followups, type Followup } from '@/lib/mock-data';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GroupedBarChart } from '@/components/charts';
import { followupBars, dashboardKpis } from '@/lib/mock-data';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';

const statusMap = {
  ativo:       { label: 'Agendado',   icon: Clock,          variant: 'warning' as const },
  enviado:     { label: 'Enviado',    icon: MessageSquare,  variant: 'info'    as const },
  respondido:  { label: 'Respondido', icon: CheckCircle2,   variant: 'success' as const },
  cancelado:   { label: 'Cancelado',  icon: XCircle,        variant: 'secondary' as const },
};

const emotionEmoji: Record<string, string> = {
  animado: '😊', curioso: '🤔', indeciso: '😕', frustrado: '😠',
  satisfeito: '😌', urgente: '⚡', neutro: '😐',
};

function FollowupCard({ fu, index }: { fu: Followup; index: number }) {
  const st = statusMap[fu.status];
  const Icon = st.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-xl border border-border bg-card/60 backdrop-blur-xl p-4 hover:border-primary/30 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-500/20 text-sm font-semibold">
            {fu.clienteNome.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <div className="font-medium text-sm">{fu.clienteNome}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span>{emotionEmoji[fu.emocao]} {fu.emocao}</span>
              <span>·</span>
              <span>Score {fu.scoreContexto}</span>
            </div>
          </div>
        </div>
        <Badge variant={st.variant} className="flex items-center gap-1 text-[10px] shrink-0">
          <Icon className="h-3 w-3" />{st.label}
        </Badge>
      </div>

      <div className="mt-3 rounded-lg bg-accent/50 border border-border/50 p-3 text-sm italic text-muted-foreground">
        "{fu.mensagem}"
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDateTime(fu.horarioProgramado)}</span>
        </div>
        {fu.taxaResposta !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Taxa resposta</span>
            <div className="w-16">
              <Progress value={fu.taxaResposta} className="h-1.5" />
            </div>
            <span className="text-xs font-medium tabular-nums">{fu.taxaResposta}%</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function FollowupsPage() {
  const [tab, setTab] = useState('todos');
  const filtered = tab === 'todos' ? followups : followups.filter(f => f.status === tab);

  const stats = {
    ativos:      followups.filter(f => f.status === 'ativo').length,
    enviados:    followups.filter(f => f.status === 'enviado').length,
    respondidos: followups.filter(f => f.status === 'respondido').length,
    cancelados:  followups.filter(f => f.status === 'cancelado').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        description="Central de acompanhamento automático de leads"
        actions={<Button variant="glow" size="sm"><Plus className="h-3.5 w-3.5" /> Novo Follow-up</Button>}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Agendados',   value: stats.ativos,      icon: Clock,         color: 'text-warning', bg: 'from-warning/15 to-orange-500/5' },
          { label: 'Enviados',    value: stats.enviados,    icon: MessageSquare, color: 'text-info',    bg: 'from-info/15 to-cyan-500/5' },
          { label: 'Respondidos', value: stats.respondidos, icon: CheckCircle2,  color: 'text-success', bg: 'from-success/15 to-emerald-500/5' },
          { label: 'Cancelados',  value: stats.cancelados,  icon: XCircle,       color: 'text-muted-foreground', bg: 'from-muted to-muted/5' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={cn('relative overflow-hidden rounded-xl border border-border glass p-4')}>
              <div className={cn('absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-50 bg-gradient-to-br', s.bg)} />
              <div className={cn('flex items-center gap-2 mb-1', s.color)}>
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{s.label}</span>
              </div>
              <div className="text-3xl font-bold tabular-nums">{s.value}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main List */}
        <div className="xl:col-span-2 space-y-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="todos">Todos ({followups.length})</TabsTrigger>
              <TabsTrigger value="ativo">Agendados</TabsTrigger>
              <TabsTrigger value="enviado">Enviados</TabsTrigger>
              <TabsTrigger value="respondido">Respondidos</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="space-y-2 mt-4">
              {filtered.map((fu, i) => <FollowupCard key={fu.id} fu={fu} index={i} />)}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Chart */}
        <div className="space-y-4">
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Follow-ups por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <GroupedBarChart data={followupBars} height={220} />
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Métricas Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Taxa de Resposta',   value: dashboardKpis.taxaResposta.value,   suffix: '%' },
                { label: 'Taxa Reativação',    value: dashboardKpis.taxaReativacao.value,  suffix: '%' },
              ].map(m => (
                <div key={m.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-medium tabular-nums">{m.value}{m.suffix}</span>
                  </div>
                  <Progress value={m.value} />
                </div>
              ))}

              <div className="pt-2 border-t border-border space-y-2">
                <div className="text-xs text-muted-foreground font-medium">Próximos 3 follow-ups</div>
                {followups.filter(f => f.status === 'ativo').slice(0, 3).map(fu => (
                  <div key={fu.id} className="text-xs flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate font-medium">{fu.clienteNome.split(' ')[0]}</span>
                    <span className="text-muted-foreground ml-auto shrink-0">{timeAgo(fu.horarioProgramado)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
