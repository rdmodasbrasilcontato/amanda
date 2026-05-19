'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, MessageSquare, Bell, TrendingUp, RefreshCw, DollarSign, Zap, Flame, Thermometer, Snowflake, Bot, Smartphone, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GrowthAreaChart, DonutChart, GroupedBarChart, ColumnChart,
  HorizontalBarChart, VectorScatterChart, MultiLineChart,
} from '@/components/charts';
import {
  dashboardKpis, growthSeries as mockGrowth, emotionPie as mockEmotionPie,
  categoryPie, leadStatusPie, intentionPie, behaviorPie, followupBars,
  productBars, salesBars, emotionalEvolution, emotionScatter,
} from '@/lib/mock-data';
import { formatCurrency, timeAgo } from '@/lib/utils';

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

export default function DashboardPage() {
  const [apiData, setApiData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, clientesRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/clientes?page=1&limit=6'),
      ]);
      if (dashRes.ok) {
        const dash = await dashRes.json();
        const clientes = clientesRes.ok ? (await clientesRes.json()).clientes : [];
        setApiData({ ...dash, recentClients: clientes });
      }
    } catch {
      // Mantém dados mockados em caso de erro
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // KPIs: usa real se disponível, senão mock
  const kpis = apiData?.kpis;
  const totalClientes    = kpis?.totalClientes    ?? dashboardKpis.totalClientes.value;
  const totalMensagens   = kpis?.totalMensagens   ?? dashboardKpis.totalMensagens.value;
  const totalFollowups   = kpis?.totalFollowups   ?? dashboardKpis.totalFollowups.value;
  const taxaResposta     = kpis?.taxaResposta      ?? dashboardKpis.taxaResposta.value;
  const clientesQuentes  = kpis?.clientesQuentes   ?? dashboardKpis.clientesQuentes.value;
  const clientesMornos   = kpis?.clientesMornos    ?? dashboardKpis.clientesMornos.value;
  const clientesFrios    = kpis?.clientesFrios      ?? dashboardKpis.clientesFrios.value;

  // Gráficos
  const growth = apiData?.growthSeries ?? mockGrowth;
  const emotionPieData = apiData?.emotionCount
    ? Object.entries(apiData.emotionCount).map(([name, value]) => ({ name, value }))
    : mockEmotionPie;

  const recentClients = apiData?.recentClients ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visão geral da Amanda AI em tempo real"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button variant="glow" size="sm">Exportar Relatório</Button>
          </div>
        }
      />

      {/* ── KPIs Row 1 ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard label="Total Clientes"   value={totalClientes}   icon={Users}         accent="primary" index={0} />
        <KpiCard label="Total Leads"      value={dashboardKpis.totalLeads.value} change={dashboardKpis.totalLeads.change} icon={TrendingUp} accent="info" index={1} />
        <KpiCard label="Mensagens"        value={totalMensagens}  icon={MessageSquare} accent="success" index={2} />
        <KpiCard label="Follow-ups"       value={totalFollowups}  icon={Bell}          accent="warning" index={3} />
        <KpiCard label="Taxa Resposta"    value={taxaResposta}    icon={Zap}           accent="primary" suffix="%" index={4} />
        <KpiCard label="Reativação"       value={dashboardKpis.taxaReativacao.value} change={dashboardKpis.taxaReativacao.change} icon={RefreshCw} accent="success" suffix="%" index={5} />
        <KpiCard label="Ticket Médio"     value={formatCurrency(dashboardKpis.ticketMedio.value)} change={dashboardKpis.ticketMedio.change} icon={DollarSign} accent="warm" index={6} />
      </div>

      {/* ── KPIs Row 2 ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard label="Score Médio"      value={dashboardKpis.scoreMedio.value} change={dashboardKpis.scoreMedio.change} icon={Star} accent="warning" index={7} />
        <KpiCard label="Clientes Ativos"  value={dashboardKpis.clientesAtivos.value} change={dashboardKpis.clientesAtivos.change} icon={Users} accent="success" index={8} />
        <KpiCard label="Clientes Quentes" value={clientesQuentes}  icon={Flame}       accent="hot"     index={9} />
        <KpiCard label="Clientes Mornos"  value={clientesMornos}   icon={Thermometer} accent="warm"    index={10} />
        <KpiCard label="Clientes Frios"   value={clientesFrios}    icon={Snowflake}   accent="cold"    index={11} />
        <KpiCard label="Agentes Ativos"   value={dashboardKpis.agentesAtivos.value} icon={Bot} accent="primary" index={12} />
        <KpiCard label="Núm. Conectados"  value={dashboardKpis.numerosConectados.value} icon={Smartphone} accent="success" index={13} />
      </div>

      {/* ── Main Charts ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Crescimento Diário</CardTitle>
            <CardDescription>Clientes e mensagens nos últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <GrowthAreaChart data={growth} />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Emoções Predominantes</CardTitle>
            <CardDescription>Distribuição emocional dos clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={emotionPieData} />
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3 ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status dos Leads</CardTitle>
            <CardDescription>Temperatura da base de clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={leadStatusPie} innerRadius={50} />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Intenção Detectada</CardTitle>
            <CardDescription>Objetivo da última interação</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={intentionPie} innerRadius={50} />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Categorias Favoritas</CardTitle>
            <CardDescription>Produtos mais buscados</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={categoryPie} innerRadius={50} />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comportamento</CardTitle>
            <CardDescription>Perfil comportamental dos clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={behaviorPie} innerRadius={50} />
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4 ───────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Follow-ups por Dia</CardTitle>
            <CardDescription>Enviados vs respondidos na última semana</CardDescription>
          </CardHeader>
          <CardContent>
            <GroupedBarChart data={followupBars} />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução Emocional</CardTitle>
            <CardDescription>Emoções ao longo dos últimos 14 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <MultiLineChart data={emotionalEvolution} series={[
              { key: 'animado',    color: 'hsl(252 87% 67%)', name: 'Animado'   },
              { key: 'curioso',    color: 'hsl(199 89% 48%)', name: 'Curioso'   },
              { key: 'satisfeito', color: 'hsl(142 71% 45%)', name: 'Satisfeito'},
              { key: 'frustrado',  color: 'hsl(0 84% 60%)',   name: 'Frustrado' },
            ]} />
          </CardContent>
        </Card>
      </div>

      {/* ── Row 5 ───────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Produtos Mais Vistos</CardTitle>
            <CardDescription>Menções e visualizações por produto</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={productBars} xKey="produto" />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vendas Mensais</CardTitle>
            <CardDescription>Número de vendas por mês no ano</CardDescription>
          </CardHeader>
          <CardContent>
            <ColumnChart data={salesBars} bars={[
              { key: 'vendas', color: 'hsl(252 87% 67%)', name: 'Vendas' },
            ]} />
          </CardContent>
        </Card>
      </div>

      {/* ── Row 6: Scatter + Recent ──────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Score vs Engajamento</CardTitle>
            <CardDescription>Mapa vetorial de correlação entre score e engajamento dos clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <VectorScatterChart
              data={emotionScatter}
              xKey="emocao" yKey="engajamento"
              xName="Score Emocional" yName="Engajamento"
            />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Atividade Recente</CardTitle>
            <CardDescription>Últimas interações</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentClients.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  {loading ? 'Carregando...' : 'Nenhuma interação recente'}
                </div>
              ) : recentClients.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 px-6 py-3 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-500/20 text-xs font-semibold">
                    {(c.nome ?? '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{c.nome}</div>
                    <div className="text-xs text-muted-foreground">Score {c.leadScore}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={
                      c.emocaoDominante === 'animado'    ? 'success'     :
                      c.emocaoDominante === 'frustrado'  ? 'destructive' :
                      c.emocaoDominante === 'urgente'    ? 'hot'         : 'default'
                    } className="mb-1 text-[10px]">
                      {c.emocaoDominante}
                    </Badge>
                    <div className="text-[10px] text-muted-foreground">{timeAgo(c.ultimaInteracao)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
