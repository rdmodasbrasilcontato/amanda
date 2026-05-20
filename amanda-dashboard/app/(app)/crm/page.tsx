'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Users, DollarSign, PercentIcon, RefreshCw, Trophy, Flame,
  AlertTriangle, UserX, Star, BarChart2, Tag, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { DonutChart, HorizontalBarChart } from '@/components/charts';
import { cn, formatCurrency, formatPercent, timeAgo, initials } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TopCliente {
  id: string;
  nome: string;
  telefone: string;
  valor_total_gasto: number;
  total_pedidos: number;
  temperatura_lead: number;
  categoria_favorita: string;
  ultima_interacao: string;
}

interface CrmData {
  topClientes: TopCliente[];
  funil: { etapa: string; count: number }[];
  ticketMedio: number;
  totalReceita: number;
  categorias: { name: string; value: number }[];
  intencoes: { name: string; value: number }[];
  comportamentos: { name: string; value: number }[];
  retencao: number;
  rfm: {
    campoes: number;
    emCrescimento: number;
    emRisco: number;
    perdidos: number;
    regulares: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function TempBadge({ score }: { score: number }) {
  if (score >= 81) return <Badge variant="destructive">🔥 Muito Quente</Badge>;
  if (score >= 51) return <Badge variant="warning">⚡ Quente</Badge>;
  if (score >= 21) return <Badge variant="info">🌡️ Morno</Badge>;
  return <Badge variant="outline">❄️ Frio</Badge>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CrmPage() {
  const [data, setData] = useState<CrmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/crm');
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

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="CRM" description="Visão completa do pipeline e performance de clientes" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
        <div className="h-10 w-64 rounded-lg bg-white/5 animate-pulse" />
        <div className="h-96 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="CRM" description="Visão completa do pipeline e performance de clientes" />
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center max-w-sm">
            <p className="text-destructive font-semibold mb-2">Erro ao carregar o CRM</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxFunilCount = Math.max(...(data.funil?.map(f => f.count) ?? [1]), 1);

  // Prepare chart data for HorizontalBarChart — needs "name" and "value" keys mapped
  const comportamentosChart = (data.comportamentos ?? []).map(c => ({
    produto: c.name,
    vistos: c.value,
    citados: 0,
  }));

  const categoriasChart = (data.categorias ?? []).map(c => ({
    produto: c.name,
    vistos: c.value,
    citados: 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM"
        description="Visão completa do pipeline e performance de clientes"
        actions={
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Atualizar
          </Button>
        }
      />

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        <KpiCard
          label="Total Receita"
          value={formatCurrency(data.totalReceita ?? 0)}
          icon={DollarSign}
          accent="success"
          index={0}
        />
        <KpiCard
          label="Ticket Médio"
          value={formatCurrency(data.ticketMedio ?? 0)}
          icon={TrendingUp}
          accent="primary"
          index={1}
        />
        <KpiCard
          label="Taxa Retenção"
          value={formatPercent(data.retencao ?? 0)}
          icon={PercentIcon}
          accent="info"
          index={2}
        />
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="top_clientes">Top Clientes</TabsTrigger>
          <TabsTrigger value="segmentacao">Segmentação</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
        </TabsList>

        {/* ── Pipeline ── */}
        <TabsContent value="pipeline" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Funil */}
            <Card className="rounded-2xl border border-border bg-white/5 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-primary" />
                  Funil de Vendas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.funil?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem dados de funil</p>
                )}
                {data.funil?.map((stage, i) => {
                  const pct = Math.round((stage.count / maxFunilCount) * 100);
                  return (
                    <motion.div
                      key={stage.etapa}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="space-y-1"
                    >
                      <div className="flex justify-between text-sm">
                        <span className="font-medium capitalize">{stage.etapa}</span>
                        <span className="text-muted-foreground tabular-nums">{stage.count}</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>

            {/* RFM Segments */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Segmentos RFM</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Campeões',      value: data.rfm?.campoes ?? 0,       icon: Trophy,        variant: 'success'     as const, desc: 'Alta frequência e valor' },
                  { label: 'Em Crescimento',value: data.rfm?.emCrescimento ?? 0, icon: TrendingUp,    variant: 'info'        as const, desc: 'Engajamento crescente' },
                  { label: 'Em Risco',      value: data.rfm?.emRisco ?? 0,       icon: AlertTriangle, variant: 'warning'     as const, desc: 'Precisam de atenção' },
                  { label: 'Perdidos',      value: data.rfm?.perdidos ?? 0,      icon: UserX,         variant: 'destructive' as const, desc: 'Sem compras recentes' },
                ].map((seg, i) => {
                  const Icon = seg.icon;
                  return (
                    <motion.div
                      key={seg.label}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="rounded-2xl border border-border bg-white/5 backdrop-blur-sm p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={seg.variant} className="p-1.5">
                          <Icon className="h-3 w-3" />
                        </Badge>
                        <span className="text-xs font-medium">{seg.label}</span>
                      </div>
                      <div className="text-2xl font-bold tabular-nums">{seg.value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{seg.desc}</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Top Clientes ── */}
        <TabsContent value="top_clientes" className="mt-4">
          <Card className="rounded-2xl border border-border bg-white/5 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                Top 10 Clientes por Valor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(data.topClientes?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">Nenhum cliente encontrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="pb-3 text-left font-medium w-8">#</th>
                        <th className="pb-3 text-left font-medium">Cliente</th>
                        <th className="pb-3 text-right font-medium">Pedidos</th>
                        <th className="pb-3 text-right font-medium">Total Gasto</th>
                        <th className="pb-3 text-right font-medium">Ticket Médio</th>
                        <th className="pb-3 text-center font-medium">Temp.</th>
                        <th className="pb-3 text-right font-medium">Últ. Interact.</th>
                        <th className="pb-3 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {data.topClientes.slice(0, 10).map((c, i) => (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="border-b border-border/50 hover:bg-white/5 transition-colors"
                        >
                          <td className="py-3 pr-2 text-muted-foreground tabular-nums text-xs">{i + 1}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-[9px]">{initials(c.nome)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{c.nome}</div>
                                <div className="text-xs text-muted-foreground">{c.telefone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-right tabular-nums">{c.total_pedidos}</td>
                          <td className="py-3 text-right tabular-nums font-semibold text-success">
                            {formatCurrency(c.valor_total_gasto)}
                          </td>
                          <td className="py-3 text-right tabular-nums text-muted-foreground">
                            {formatCurrency(c.total_pedidos > 0 ? c.valor_total_gasto / c.total_pedidos : 0)}
                          </td>
                          <td className="py-3 text-center">
                            <TempBadge score={c.temperatura_lead} />
                          </td>
                          <td className="py-3 text-right text-xs text-muted-foreground">
                            {timeAgo(c.ultima_interacao)}
                          </td>
                          <td className="py-3">
                            <Link href={`/clientes/${c.id}`}>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Segmentação ── */}
        <TabsContent value="segmentacao" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="rounded-2xl border border-border bg-white/5 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Intenções de Compra</CardTitle>
              </CardHeader>
              <CardContent>
                {(data.intencoes?.length ?? 0) === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                    Sem dados de intenções
                  </div>
                ) : (
                  <DonutChart data={data.intencoes} height={260} />
                )}
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-white/5 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Comportamentos Dominantes</CardTitle>
              </CardHeader>
              <CardContent>
                {comportamentosChart.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                    Sem dados de comportamentos
                  </div>
                ) : (
                  <HorizontalBarChart data={comportamentosChart} height={260} xKey="produto" />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Categorias ── */}
        <TabsContent value="categorias" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="rounded-2xl border border-border bg-white/5 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  Categorias Favoritas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoriasChart.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                    Sem dados de categorias
                  </div>
                ) : (
                  <HorizontalBarChart data={categoriasChart} height={280} xKey="produto" />
                )}
              </CardContent>
            </Card>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Top 3 Categorias</h3>
              {(data.categorias ?? []).slice(0, 3).map((cat, i) => {
                const total = data.categorias.reduce((s, c) => s + c.value, 0);
                const pct = total > 0 ? (cat.value / total) * 100 : 0;
                return (
                  <motion.div
                    key={cat.name}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="rounded-2xl border border-border bg-white/5 backdrop-blur-sm p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="w-5 h-5 p-0 items-center justify-center text-[10px]">
                          {i + 1}
                        </Badge>
                        <span className="font-medium text-sm">{cat.name}</span>
                      </div>
                      <span className="text-sm tabular-nums font-semibold">{cat.value}</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <div className="text-xs text-muted-foreground mt-1">{formatPercent(pct)} do total</div>
                  </motion.div>
                );
              })}
              {(data.categorias?.length ?? 0) === 0 && (
                <div className="rounded-2xl border border-border bg-white/5 p-8 text-center text-muted-foreground text-sm">
                  Sem dados de categorias
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
