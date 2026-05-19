'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  GrowthAreaChart, DonutChart, GroupedBarChart, ColumnChart,
  HorizontalBarChart, VectorScatterChart, MultiLineChart,
} from '@/components/charts';
import {
  growthSeries, emotionPie, categoryPie, leadStatusPie, intentionPie,
  behaviorPie, followupBars, productBars, salesBars, emotionalEvolution, emotionScatter, hourlyActivity,
} from '@/lib/mock-data';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Análise comportamental e de performance em profundidade"
        actions={
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              {['7d', '30d', '90d', '1a'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-2 transition-colors ${period === p ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                  {p}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Exportar</Button>
          </div>
        }
      />

      <Tabs defaultValue="comportamental">
        <TabsList>
          <TabsTrigger value="comportamental">Comportamental</TabsTrigger>
          <TabsTrigger value="emocional">Emocional</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="horarios">Horários</TabsTrigger>
          <TabsTrigger value="vetorial">Análise Vetorial</TabsTrigger>
        </TabsList>

        {/* ── Comportamental ──────────────────────── */}
        <TabsContent value="comportamental" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Crescimento de Clientes</CardTitle>
                <CardDescription>Evolução diária de clientes, mensagens e conversões</CardDescription>
              </CardHeader>
              <CardContent><GrowthAreaChart data={growthSeries} /></CardContent>
            </Card>
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status dos Leads</CardTitle>
                <CardDescription>Distribuição por temperatura</CardDescription>
              </CardHeader>
              <CardContent><DonutChart data={leadStatusPie} /></CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <Card className="glass">
              <CardHeader className="pb-2"><CardTitle className="text-base">Comportamento</CardTitle></CardHeader>
              <CardContent><DonutChart data={behaviorPie} height={220} innerRadius={45} /></CardContent>
            </Card>
            <Card className="glass">
              <CardHeader className="pb-2"><CardTitle className="text-base">Intenção de Compra</CardTitle></CardHeader>
              <CardContent><DonutChart data={intentionPie} height={220} innerRadius={45} /></CardContent>
            </Card>
            <Card className="glass">
              <CardHeader className="pb-2"><CardTitle className="text-base">Categorias</CardTitle></CardHeader>
              <CardContent><DonutChart data={categoryPie} height={220} innerRadius={45} /></CardContent>
            </Card>
          </div>
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Produtos Mais Vistos e Citados</CardTitle>
            </CardHeader>
            <CardContent><HorizontalBarChart data={productBars} xKey="produto" height={250} /></CardContent>
          </Card>
        </TabsContent>

        {/* ── Emocional ───────────────────────────── */}
        <TabsContent value="emocional" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Evolução Emocional</CardTitle>
                <CardDescription>Dinâmica das emoções ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent><MultiLineChart data={emotionalEvolution} series={[
                { key: 'animado', color: 'hsl(252 87% 67%)', name: 'Animado' },
                { key: 'curioso', color: 'hsl(199 89% 48%)', name: 'Curioso' },
                { key: 'satisfeito', color: 'hsl(142 71% 45%)', name: 'Satisfeito' },
                { key: 'frustrado', color: 'hsl(0 84% 60%)', name: 'Frustrado' },
              ]} /></CardContent>
            </Card>
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Emoções Predominantes</CardTitle>
                <CardDescription>Snapshot atual</CardDescription>
              </CardHeader>
              <CardContent><DonutChart data={emotionPie} /></CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Vendas ──────────────────────────────── */}
        <TabsContent value="vendas" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Vendas Mensais</CardTitle>
              </CardHeader>
              <CardContent>
                <ColumnChart data={salesBars} bars={[{ key: 'vendas', color: 'hsl(252 87% 67%)', name: 'Vendas' }]} />
              </CardContent>
            </Card>
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Follow-ups — Enviados vs Respondidos</CardTitle>
              </CardHeader>
              <CardContent><GroupedBarChart data={followupBars} /></CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Horários ────────────────────────────── */}
        <TabsContent value="horarios" className="space-y-4">
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Interações por Hora do Dia</CardTitle>
              <CardDescription>Quando os clientes mais interagem — otimize o timing dos follow-ups</CardDescription>
            </CardHeader>
            <CardContent>
              <ColumnChart data={hourlyActivity} xKey="hora" bars={[{ key: 'interacoes', color: 'hsl(252 87% 67%)', name: 'Interações' }]} height={320} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Vetorial ────────────────────────────── */}
        <TabsContent value="vetorial" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Score Emocional vs Engajamento</CardTitle>
              </CardHeader>
              <CardContent>
                <VectorScatterChart data={emotionScatter} xKey="emocao" yKey="engajamento" xName="Score Emocional" yName="Engajamento" />
              </CardContent>
            </Card>
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Comportamento vs Conversão</CardTitle>
              </CardHeader>
              <CardContent>
                <VectorScatterChart data={emotionScatter} xKey="comportamento" yKey="conversao" xName="Comportamental" yName="Prob. Conversão" />
              </CardContent>
            </Card>
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Frequência vs Compras</CardTitle>
              </CardHeader>
              <CardContent>
                <VectorScatterChart data={emotionScatter} xKey="frequencia" yKey="compras" xName="Frequência" yName="Qtd. Compras" />
              </CardContent>
            </Card>
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Score vs Ticket</CardTitle>
              </CardHeader>
              <CardContent>
                <VectorScatterChart data={emotionScatter} xKey="score" yKey="ticket" xName="Lead Score" yName="Ticket Médio" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
