'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users, MessageSquare, Bell, TrendingUp, RefreshCw,
  Flame, Thermometer, Snowflake, AlertCircle, ArrowRight,
  Activity, Star, Zap, Target, Clock, Crown,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { GrowthAreaChart, DonutChart } from '@/components/charts';
import { formatCurrency, timeAgo, initials } from '@/lib/utils';

interface DashboardData {
  kpis: {
    totalClientes: number;
    totalMensagens: number;
    totalFollowups: number;
    taxaResposta: number;
    clientesQuentes: number;
    clientesMornos: number;
    clientesFrios: number;
  };
  growthSeries: { date: string; clientes: number; mensagens: number }[];
  emotionCount: Record<string, number>;
  recentClients?: any[];
}

const EMOTION_CONFIG: Record<string, { emoji: string; color: string; variant: any }> = {
  animado:    { emoji: '😄', color: 'text-success',     variant: 'success'     },
  curioso:    { emoji: '🤔', color: 'text-info',        variant: 'info'        },
  indeciso:   { emoji: '😐', color: 'text-warning',     variant: 'warning'     },
  frustrado:  { emoji: '😠', color: 'text-destructive', variant: 'destructive' },
  satisfeito: { emoji: '😊', color: 'text-success',     variant: 'success'     },
  urgente:    { emoji: '🚨', color: 'text-destructive', variant: 'destructive' },
  neutro:     { emoji: '😶', color: 'text-muted-foreground', variant: 'outline'},
  ansioso:    { emoji: '😰', color: 'text-warning',     variant: 'warning'     },
  feliz:      { emoji: '😁', color: 'text-success',     variant: 'success'     },
};

function TempBadge({ score }: { score: number }) {
  if (score >= 81) return <Badge variant="destructive" className="text-[10px]">🔥 Muito Quente</Badge>;
  if (score >= 51) return <Badge variant="warning"     className="text-[10px]">⚡ Quente</Badge>;
  if (score >= 21) return <Badge variant="info"        className="text-[10px]">🌡️ Morno</Badge>;
  return <Badge variant="outline" className="text-[10px]">❄️ Frio</Badge>;
}

function SkeletonKpi() {
  return (
    <div className="rounded-2xl border border-border glass p-4 animate-pulse">
      <div className="h-3 w-20 bg-muted rounded mb-3" />
      <div className="h-8 w-16 bg-muted rounded mb-2" />
      <div className="h-2 w-12 bg-muted rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const [apiData, setApiData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, clientesRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/clientes?page=1&limit=8'),
      ]);
      if (!dashRes.ok) throw new Error(`Erro ${dashRes.status} ao carregar dashboard`);
      const dash = await dashRes.json();
      if (dash.error) throw new Error(dash.error);
      const clientes = clientesRes.ok ? (await clientesRes.json()).clientes ?? [] : [];
      setApiData({ ...dash, recentClients: clientes });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kpis = apiData?.kpis;
  const growth = apiData?.growthSeries ?? [];
  const emotionPieData = apiData?.emotionCount
    ? Object.entries(apiData.emotionCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    : [];
  const recentClients = apiData?.recentClients ?? [];

  const totalTemp = (kpis?.clientesQuentes ?? 0) + (kpis?.clientesMornos ?? 0) + (kpis?.clientesFrios ?? 0);
  const pctQuente = totalTemp > 0 ? Math.round((kpis?.clientesQuentes ?? 0) / totalTemp * 100) : 0;
  const pctMorno  = totalTemp > 0 ? Math.round((kpis?.clientesMornos  ?? 0) / totalTemp * 100) : 0;
  const pctFrio   = totalTemp > 0 ? Math.round((kpis?.clientesFrios   ?? 0) / totalTemp * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Central operacional da Amanda AI em tempo real"
        actions={
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        }
      />

      {/* Error state */}
      {error && !loading && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Verifique a conexão com o Supabase e o arquivo .env</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>Tentar novamente</Button>
        </motion.div>
      )}

      {/* KPI Grid */}
      {loading && !apiData ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => <SkeletonKpi key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <KpiCard label="Total Clientes"   value={kpis?.totalClientes   ?? 0} icon={Users}         accent="primary"  index={0} />
          <KpiCard label="Total Mensagens"  value={kpis?.totalMensagens  ?? 0} icon={MessageSquare} accent="success"  index={1} />
          <KpiCard label="Follow-ups"       value={kpis?.totalFollowups  ?? 0} icon={Bell}          accent="warning"  index={2} />
          <KpiCard label="Taxa Resposta"    value={kpis?.taxaResposta    ?? 0} icon={TrendingUp}    accent="primary"  suffix="%" index={3} />
          <KpiCard label="Muito Quentes"    value={kpis?.clientesQuentes ?? 0} icon={Flame}         accent="hot"      index={4} />
          <KpiCard label="Mornos"           value={kpis?.clientesMornos  ?? 0} icon={Thermometer}   accent="warm"     index={5} />
          <KpiCard label="Frios"            value={kpis?.clientesFrios   ?? 0} icon={Snowflake}     accent="cold"     index={6} />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Growth Chart */}
        <Card className="xl:col-span-2 glass rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Crescimento Diário</CardTitle>
                <CardDescription>Clientes e mensagens — últimos 30 dias</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px]">
                <Activity className="h-3 w-3 mr-1" /> Ao vivo
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading && !growth.length ? (
              <div className="h-64 animate-pulse bg-muted/30 rounded-xl" />
            ) : growth.length > 0 ? (
              <GrowthAreaChart data={growth} />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Activity className="h-8 w-8 opacity-30" />
                <p className="text-sm">Sem dados de crescimento ainda</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emotion Pie */}
        <Card className="glass rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mapa Emocional</CardTitle>
            <CardDescription>Emoções detectadas nas conversas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !emotionPieData.length ? (
              <div className="h-64 animate-pulse bg-muted/30 rounded-xl" />
            ) : emotionPieData.length > 0 ? (
              <DonutChart data={emotionPieData} />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Target className="h-8 w-8 opacity-30" />
                <p className="text-sm">Sem dados emocionais ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Temperature Breakdown + Recent Clients */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Temperature breakdown */}
        <Card className="glass rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Temperatura dos Leads</CardTitle>
            <CardDescription>Distribuição por engajamento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Muito Quentes 🔥', value: kpis?.clientesQuentes ?? 0, pct: pctQuente, color: 'bg-destructive', icon: Flame },
              { label: 'Mornos 🌡️',         value: kpis?.clientesMornos  ?? 0, pct: pctMorno,  color: 'bg-warning',     icon: Thermometer },
              { label: 'Frios ❄️',           value: kpis?.clientesFrios   ?? 0, pct: pctFrio,   color: 'bg-info',        icon: Snowflake },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold tabular-nums">{item.value} <span className="text-muted-foreground font-normal text-xs">({item.pct}%)</span></span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${item.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Total de leads ativos</span>
                <span className="font-semibold text-foreground">{totalTemp}</span>
              </div>
            </div>

            <Link href="/kanban">
              <Button variant="outline" size="sm" className="w-full mt-1">
                Ver Kanban <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card className="xl:col-span-2 glass rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Clientes Recentes</CardTitle>
                <CardDescription>Últimas interações registradas</CardDescription>
              </div>
              <Link href="/clientes">
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver todos <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading && !recentClients.length ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-3 animate-pulse">
                    <div className="h-9 w-9 rounded-full bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 bg-muted rounded" />
                      <div className="h-2 w-20 bg-muted rounded" />
                    </div>
                    <div className="h-5 w-16 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : recentClients.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Nenhum cliente ainda</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentClients.map((c: any, i: number) => {
                  const ec = EMOTION_CONFIG[c.emocaoDominante] ?? EMOTION_CONFIG.neutro;
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link
                        href={`/clientes/${c.id}`}
                        className="flex items-center gap-3 px-6 py-3 hover:bg-accent/40 transition-colors group"
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-fuchsia-500/20 text-xs font-semibold">
                            {initials(c.nome ?? '?')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {c.nome ?? c.telefone}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{c.telefone}</span>
                            {c.categoriaFavorita && (
                              <span className="text-[10px] text-muted-foreground/60">· {c.categoriaFavorita}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <TempBadge score={c.leadScore ?? 0} />
                          <div className="text-[10px] text-muted-foreground text-right">
                            {c.ultimaInteracao ? timeAgo(c.ultimaInteracao) : '—'}
                          </div>
                        </div>
                        <div className="text-lg shrink-0 ml-1" title={c.emocaoDominante}>
                          {ec.emoji}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/followups',  icon: Bell,         label: 'Follow-ups',     desc: 'Gerenciar envios',       color: 'from-warning/20 to-orange-500/10',   border: 'border-warning/20' },
          { href: '/kanban',     icon: Zap,          label: 'Kanban CRM',     desc: 'Pipeline de leads',      color: 'from-primary/20 to-fuchsia-500/10',  border: 'border-primary/20' },
          { href: '/analytics',  icon: TrendingUp,   label: 'Analytics',      desc: 'Insights comportamentais', color: 'from-info/20 to-cyan-500/10',      border: 'border-info/20'    },
          { href: '/clientes',   icon: Crown,        label: 'Top Clientes',   desc: 'Ver ranking de leads',   color: 'from-success/20 to-emerald-500/10',  border: 'border-success/20' },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div key={item.href} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.06 }}>
              <Link href={item.href}>
                <div className={`rounded-2xl border ${item.border} bg-gradient-to-br ${item.color} p-4 hover:scale-[1.02] transition-all cursor-pointer group`}>
                  <Icon className="h-5 w-5 mb-2 text-foreground/70 group-hover:text-primary transition-colors" />
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
