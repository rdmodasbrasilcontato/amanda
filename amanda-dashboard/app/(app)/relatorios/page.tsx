'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, MessageSquare, Send, PercentIcon, Download, RefreshCw, BarChart2,
} from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GrowthAreaChart, ColumnChart, DonutChart, HorizontalBarChart } from '@/components/charts';
import { cn, formatPercent } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RelatorioData {
  periodo: string;
  novosClientes: number;
  mensagensRecebidas: number;
  followupsEnviados: number;
  followupsRespondidos: number;
  taxaResposta: number;
  scoresMedio: number;
  crescimentoSeries: { data: string; count: number }[];
  followupSeries: { data: string; count: number }[];
  topEmocoes: { name: string; value: number }[];
  topCategorias: { name: string; value: number }[];
}

type Periodo = 'diario' | 'semanal' | 'mensal' | 'anual';

const PERIODOS: { id: Periodo; label: string; badge: string }[] = [
  { id: 'diario',  label: 'Diário',  badge: 'Hoje' },
  { id: 'semanal', label: 'Semanal', badge: 'Semana' },
  { id: 'mensal',  label: 'Mensal',  badge: 'Mês' },
  { id: 'anual',   label: 'Anual',   badge: 'Ano' },
];

// ─── Período Content ──────────────────────────────────────────────────────────
function PeriodoContent({ periodo }: { periodo: Periodo }) {
  const [data, setData] = useState<RelatorioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/relatorios?periodo=${periodo}`);
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message ?? 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = (type: 'CSV' | 'XLSX') => {
    // Toast-like behavior via console + alert — no toast library imported
    console.info(`Exportando ${type} para período: ${periodo}`);
  };

  if (loading) {
    return (
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="h-72 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-72 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-60 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-60 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 mt-4">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center max-w-sm">
          <p className="text-destructive font-semibold mb-2">Erro ao carregar relatório</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Map API data to chart-compatible formats
  const crescimentoForChart = (data.crescimentoSeries ?? []).map(d => ({
    date: d.data,
    clientes: d.count,
  }));

  const followupForChart = (data.followupSeries ?? []).map(d => ({
    mes: d.data,
    vendas: d.count,
  }));

  const categoriasForChart = (data.topCategorias ?? []).map(c => ({
    produto: c.name,
    vistos: c.value,
    citados: 0,
  }));

  const periodoLabel = PERIODOS.find(p => p.id === periodo)?.badge ?? periodo;

  return (
    <div className="space-y-6 mt-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Badge variant="outline" className="text-xs">
          {periodoLabel} · Atualizado agora
        </Badge>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('CSV')}>
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('XLSX')}>
            <Download className="h-3.5 w-3.5" />
            XLSX
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Novos Clientes"
          value={data.novosClientes ?? 0}
          icon={Users}
          accent="primary"
          index={0}
        />
        <KpiCard
          label="Mensagens Recebidas"
          value={data.mensagensRecebidas ?? 0}
          icon={MessageSquare}
          accent="info"
          index={1}
        />
        <KpiCard
          label="Follow-ups Enviados"
          value={data.followupsEnviados ?? 0}
          icon={Send}
          accent="warning"
          index={2}
        />
        <KpiCard
          label="Taxa Resposta"
          value={formatPercent(data.taxaResposta ?? 0)}
          icon={PercentIcon}
          accent="success"
          index={3}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="rounded-2xl border border-border bg-white/5 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Crescimento de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {crescimentoForChart.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Sem dados de crescimento
              </div>
            ) : (
              <GrowthAreaChart
                data={crescimentoForChart}
                height={220}
                series={[{ key: 'clientes', color: 'hsl(252 87% 67%)', name: 'Clientes' }]}
              />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-white/5 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-warning" />
              Follow-ups por Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            {followupForChart.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Sem dados de follow-ups
              </div>
            ) : (
              <ColumnChart
                data={followupForChart}
                height={220}
                xKey="mes"
                bars={[{ key: 'vendas', color: 'hsl(38 92% 50%)', name: 'Follow-ups' }]}
              />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-white/5 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-success" />
              Top Emoções
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data.topEmocoes?.length ?? 0) === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Sem dados de emoções
              </div>
            ) : (
              <DonutChart data={data.topEmocoes} height={240} />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-white/5 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-info" />
              Top Categorias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoriasForChart.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Sem dados de categorias
              </div>
            ) : (
              <HorizontalBarChart data={categoriasForChart} height={240} xKey="produto" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Relatórios completos de performance e comportamento por período"
      />

      <Tabs defaultValue="mensal">
        <TabsList>
          {PERIODOS.map(p => (
            <TabsTrigger key={p.id} value={p.id}>{p.label}</TabsTrigger>
          ))}
        </TabsList>
        {PERIODOS.map(p => (
          <TabsContent key={p.id} value={p.id}>
            <PeriodoContent periodo={p.id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
