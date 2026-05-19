'use client';

import { Users, MessageSquare, Bell, TrendingUp, Heart, RefreshCw, Star, DollarSign, Zap, Flame, Thermometer, Snowflake, Bot, Smartphone } from 'lucide-react';
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
  dashboardKpis, growthSeries, emotionPie, categoryPie, leadStatusPie,
  intentionPie, behaviorPie, followupBars, productBars, salesBars,
  emotionalEvolution, emotionScatter, clients,
} from '@/lib/mock-data';
import { formatCurrency, formatPercent, timeAgo } from '@/lib/utils';

export default function DashboardPage() {
  const recentClients = [...clients].sort((a, b) =>
    new Date(b.ultimaInteracao).getTime() - new Date(a.ultimaInteracao).getTime()
  ).slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visão geral da Amanda AI em tempo real"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><RefreshCw className="h-3.5 w-3.5" /> Atualizar</Button>
            <Button variant="glow" size="sm">Exportar Relatório</Button>
          </div>
        }
      />

      {/* ── KPIs Row 1 ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard label="Total Clientes"   value={dashboardKpis.totalClientes.value}   change={dashboardKpis.totalClientes.change}   icon={Users}       accent="primary" index={0} />
        <KpiCard label="Total Leads"      value={dashboardKpis.totalLeads.value}       change={dashboardKpis.totalLeads.change}       icon={TrendingUp}  accent="info"    index={1} />
        <KpiCard label="Mensagens"        value={dashboardKpis.totalMensagens.value}   change={dashboardKpis.totalMensagens.change}   icon={MessageSquare} accent="success" index={2} />
        <KpiCard label="Follow-ups"       value={dashboardKpis.totalFollowups.value}   change={dashboardKpis.totalFollowups.change}   icon={Bell}        accent="warning" index={3} />
        <KpiCard label="Taxa Resposta"    value={dashboardKpis.taxaResposta.value}     change={dashboardKpis.taxaResposta.change}     icon={Zap}         accent="primary" suffix="%" index={4} />
        <KpiCard label="Reativação"       value={dashboardKpis.taxaReativacao.value}   change={dashboardKpis.taxaReativacao.change}   icon={RefreshCw}   accent="success" suffix="%" index={5} />
        <KpiCard label="Ticket Médio"     value={formatCurrency(dashboardKpis.ticketMedio.value)} change={dashboardKpis.ticketMedio.change} icon={DollarSign}  accent="warm"  index={6} />
      </div>

      {/* ── KPIs Row 2 ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard label="Score Médio"      value={dashboardKpis.scoreMedio.value}       change={dashboardKpis.scoreMedio.change}       icon={Star}        accent="warning" index={7} />
        <KpiCard label="Clientes Ativos"  value={dashboardKpis.clientesAtivos.value}   change={dashboardKpis.clientesAtivos.change}   icon={Users}       accent="success" index={8} />
        <KpiCard label="Clientes Quentes" value={dashboardKpis.clientesQuentes.value}  change={dashboardKpis.clientesQuentes.change}  icon={Flame}       accent="hot"     index={9} />
        <KpiCard label="Clientes Mornos"  value={dashboardKpis.clientesMornos.value}   change={dashboardKpis.clientesMornos.change}   icon={Thermometer} accent="warm"    index={10} />
        <KpiCard label="Clientes Frios"   value={dashboardKpis.clientesFrios.value}    change={dashboardKpis.clientesFrios.change}    icon={Snowflake}   accent="cold"    index={11} />
        <KpiCard label="Agentes Ativos"   value={dashboardKpis.agentesAtivos.value}    icon={Bot}         accent="primary" index={12} />
        <KpiCard label="Núm. Conectados"  value={dashboardKpis.numerosConectados.value} icon={Smartphone}  accent="success" index={13} />
      </div>

      {/* ── Main Charts ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Crescimento Diário</CardTitle>
            <CardDescription>Clientes, mensagens e conversões nos últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <GrowthAreaChart data={growthSeries} />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Emoções Predominantes</CardTitle>
            <CardDescription>Distribuição emocional dos clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={emotionPie} />
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
              { key: 'animado', color: 'hsl(252 87% 67%)', name: 'Animado' },
              { key: 'curioso', color: 'hsl(199 89% 48%)', name: 'Curioso' },
              { key: 'satisfeito', color: 'hsl(142 71% 45%)', name: 'Satisfeito' },
              { key: 'frustrado', color: 'hsl(0 84% 60%)', name: 'Frustrado' },
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
              {recentClients.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-6 py-3 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-500/20 text-xs font-semibold">
                    {c.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{c.nome}</div>
                    <div className="text-xs text-muted-foreground">{c.cidade} · Score {c.leadScore}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={
                      c.emocaoDominante === 'animado' ? 'success' :
                      c.emocaoDominante === 'frustrado' ? 'destructive' :
                      c.emocaoDominante === 'urgente' ? 'hot' : 'default'
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
