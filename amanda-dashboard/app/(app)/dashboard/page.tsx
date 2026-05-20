'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, MessageSquare, Bell, TrendingUp, RefreshCw,
  Flame, Thermometer, Snowflake, AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GrowthAreaChart, DonutChart } from '@/components/charts';
import { timeAgo } from '@/lib/utils';

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

const emotionEmoji: Record<string, string> = {
  animado: '😊', curioso: '🤔', indeciso: '😕', frustrado: '😠',
  satisfeito: '😌', urgente: '⚡', neutro: '😐',
};

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
        fetch('/api/clientes?page=1&limit=6'),
      ]);
      if (!dashRes.ok) throw new Error(`Erro ao carregar dashboard: ${dashRes.status}`);
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
    ? Object.entries(apiData.emotionCount).map(([name, value]) => ({ name, value }))
    : [];
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
          </div>
        }
      />

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Verifique a conexão com o Supabase</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>Tentar novamente</Button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !apiData && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Carregando dados...</span>
        </div>
      )}

      {/* KPIs Row 1 */}
      {(apiData || !loading) && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <KpiCard label="Total Clientes"   value={kpis?.totalClientes ?? 0}   icon={Users}         accent="primary"  index={0} />
            <KpiCard label="Total Mensagens"  value={kpis?.totalMensagens ?? 0}  icon={MessageSquare} accent="success"  index={1} />
            <KpiCard label="Follow-ups"       value={kpis?.totalFollowups ?? 0}  icon={Bell}          accent="warning"  index={2} />
            <KpiCard label="Taxa Resposta"    value={kpis?.taxaResposta ?? 0}    icon={TrendingUp}    accent="primary"  suffix="%" index={3} />
            <KpiCard label="Clientes Quentes" value={kpis?.clientesQuentes ?? 0} icon={Flame}         accent="hot"      index={4} />
            <KpiCard label="Clientes Mornos"  value={kpis?.clientesMornos ?? 0}  icon={Thermometer}   accent="warm"     index={5} />
            <KpiCard label="Clientes Frios"   value={kpis?.clientesFrios ?? 0}   icon={Snowflake}     accent="cold"     index={6} />
          </div>

          {/* Main Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="xl:col-span-2 glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Crescimento Diário</CardTitle>
                <CardDescription>Clientes e mensagens nos últimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent>
                {growth.length > 0 ? (
                  <GrowthAreaChart data={growth} />
                ) : loading ? (
                  <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Carregando gráfico...
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                    Sem dados de crescimento
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Emoções Predominantes</CardTitle>
                <CardDescription>Distribuição emocional dos clientes</CardDescription>
              </CardHeader>
              <CardContent>
                {emotionPieData.length > 0 ? (
                  <DonutChart data={emotionPieData} />
                ) : loading ? (
                  <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Carregando...
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                    Sem dados emocionais
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent activity */}
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Atividade Recente</CardTitle>
              <CardDescription>Últimas interações com clientes</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentClients.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" /> Carregando...
                      </span>
                    ) : 'Nenhuma interação recente'}
                  </div>
                ) : recentClients.map((c: any, i: number) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
                  >
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
                        {emotionEmoji[c.emocaoDominante] ?? '😐'} {c.emocaoDominante}
                      </Badge>
                      <div className="text-[10px] text-muted-foreground">
                        {c.ultimaInteracao ? timeAgo(c.ultimaInteracao) : '—'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
