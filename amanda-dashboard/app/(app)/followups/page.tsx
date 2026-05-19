'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bell, Clock, CheckCircle2, XCircle, MessageSquare, RefreshCw, Plus } from 'lucide-react';
import { followups as mockFollowups } from '@/lib/mock-data';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GroupedBarChart } from '@/components/charts';
import { followupBars, dashboardKpis } from '@/lib/mock-data';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';

const statusMap: Record<string, { label: string; icon: any; variant: any }> = {
  pendente:   { label: 'Agendado',   icon: Clock,         variant: 'warning'   },
  ativo:      { label: 'Agendado',   icon: Clock,         variant: 'warning'   },
  enviado:    { label: 'Enviado',    icon: MessageSquare, variant: 'info'      },
  respondido: { label: 'Respondido', icon: CheckCircle2,  variant: 'success'   },
  cancelado:  { label: 'Cancelado',  icon: XCircle,       variant: 'secondary' },
  falhou:     { label: 'Falhou',     icon: XCircle,       variant: 'destructive'},
};

interface ApiFollowup {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  tipo: string;
  etapa: string;
  mensagem: string;
  status: string;
  respondido: boolean;
  agendadoPara: string | null;
  enviadoEm: string | null;
  criadoEm: string;
}

function FollowupCard({ fu, index }: { fu: ApiFollowup; index: number }) {
  const st = statusMap[fu.status] ?? statusMap.pendente;
  const Icon = st.icon;
  const horario = fu.agendadoPara ?? fu.enviadoEm ?? fu.criadoEm;
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
              <span>{fu.tipo}</span>
              {fu.etapa && <><span>·</span><span>Etapa: {fu.etapa}</span></>}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={st.variant} className="flex items-center gap-1 text-[10px] shrink-0">
            <Icon className="h-3 w-3" />{st.label}
          </Badge>
          {fu.respondido && (
            <Badge variant="success" className="text-[10px]">Respondido</Badge>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-accent/50 border border-border/50 p-3 text-sm italic text-muted-foreground">
        "{fu.mensagem}"
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{horario ? formatDateTime(horario) : '—'}</span>
        </div>
        <div className="text-xs text-muted-foreground font-mono">{fu.clienteTelefone}</div>
      </div>
    </motion.div>
  );
}

// Adapta mock data para o formato da API
function adaptMock(): ApiFollowup[] {
  return mockFollowups.map(f => ({
    id: f.id,
    clienteNome: f.clienteNome,
    clienteTelefone: '',
    tipo: f.tipo ?? 'follow-up',
    etapa: '',
    mensagem: f.mensagem,
    status: f.status === 'ativo' ? 'pendente' : f.status,
    respondido: f.status === 'respondido',
    agendadoPara: f.horarioProgramado,
    enviadoEm: null,
    criadoEm: f.horarioProgramado,
  }));
}

export default function FollowupsPage() {
  const [tab, setTab] = useState('todos');
  const [allFollowups, setAllFollowups] = useState<ApiFollowup[]>([]);
  const [stats, setStats] = useState({ agendados: 0, enviados: 0, respondidos: 0, cancelados: 0 });
  const [loading, setLoading] = useState(true);
  const [useRealData, setUseRealData] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/followups?limit=100');
      if (res.ok) {
        const json = await res.json();
        if (json.followups && json.followups.length > 0) {
          setAllFollowups(json.followups);
          setStats(json.stats ?? { agendados: 0, enviados: 0, respondidos: 0, cancelados: 0 });
          setUseRealData(true);
          return;
        }
      }
    } catch {}
    // Fallback mock
    const mock = adaptMock();
    setAllFollowups(mock);
    setStats({
      agendados:  mock.filter(f => f.status === 'pendente').length,
      enviados:   mock.filter(f => f.status === 'enviado').length,
      respondidos: mock.filter(f => f.respondido).length,
      cancelados: mock.filter(f => f.status === 'cancelado').length,
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = tab === 'todos'
    ? allFollowups
    : tab === 'pendente' ? allFollowups.filter(f => f.status === 'pendente' || f.status === 'ativo')
    : tab === 'enviado'  ? allFollowups.filter(f => f.status === 'enviado')
    : allFollowups.filter(f => f.respondido);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        description={`Central de acompanhamento automático${useRealData ? ' (Supabase)' : ' (demo)'}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="glow" size="sm"><Plus className="h-3.5 w-3.5" /> Novo Follow-up</Button>
          </div>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Agendados',   value: stats.agendados,   icon: Clock,         color: 'text-warning', bg: 'from-warning/15 to-orange-500/5' },
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
              <TabsTrigger value="todos">Todos ({allFollowups.length})</TabsTrigger>
              <TabsTrigger value="pendente">Agendados</TabsTrigger>
              <TabsTrigger value="enviado">Enviados</TabsTrigger>
              <TabsTrigger value="respondido">Respondidos</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="space-y-2 mt-4">
              {loading && allFollowups.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">Carregando follow-ups...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">Nenhum follow-up encontrado</div>
              ) : filtered.map((fu, i) => <FollowupCard key={fu.id} fu={fu} index={i} />)}
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
                { label: 'Taxa de Resposta', value: allFollowups.length > 0 ? Math.round((stats.respondidos / allFollowups.length) * 100) : dashboardKpis.taxaResposta.value, suffix: '%' },
                { label: 'Taxa Reativação',  value: dashboardKpis.taxaReativacao.value, suffix: '%' },
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
                <div className="text-xs text-muted-foreground font-medium">Próximos follow-ups</div>
                {allFollowups.filter(f => f.status === 'pendente' || f.status === 'ativo').slice(0, 3).map(fu => (
                  <div key={fu.id} className="text-xs flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate font-medium">{fu.clienteNome.split(' ')[0]}</span>
                    <span className="text-muted-foreground ml-auto shrink-0">{fu.agendadoPara ? timeAgo(fu.agendadoPara) : '—'}</span>
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
