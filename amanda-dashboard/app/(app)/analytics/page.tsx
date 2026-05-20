'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, RefreshCw, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  GrowthAreaChart, DonutChart, ColumnChart,
  HorizontalBarChart, VectorScatterChart,
} from '@/components/charts';

interface AnalyticsData {
  topCategorias: { name: string; value: number }[];
  intentionPie: { name: string; value: number }[];
  behaviorPie: { name: string; value: number }[];
  hourlyActivity: { hora: string; mensagens: number }[];
  emotionScatter: { x: number; y: number; z: number; label: string }[];
  emotionCount: Record<string, number>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30d');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error('Erro ao carregar analytics');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const emotionPieData = data?.emotionCount
    ? Object.entries(data.emotionCount).map(([name, value]) => ({ name, value }))
    : [];

  // Adapt scatter data for different axis combos
  const scatterData = data?.emotionScatter ?? [];

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
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Exportar</Button>
          </div>
        }
      />

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Carregando analytics...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex flex-col items-center py-20 gap-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchData}>Tentar novamente</Button>
        </div>
      )}

      {!loading && !error && data && (
        <Tabs defaultValue="comportamental">
          <TabsList>
            <TabsTrigger value="comportamental">Comportamental</TabsTrigger>
            <TabsTrigger value="emocional">Emocional</TabsTrigger>
            <TabsTrigger value="horarios">Horários</TabsTrigger>
            <TabsTrigger value="vetorial">Análise Vetorial</TabsTrigger>
          </TabsList>

          {/* Comportamental */}
          <TabsContent value="comportamental" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <Card className="glass">
                <CardHeader className="pb-2"><CardTitle className="text-base">Comportamento Dominante</CardTitle></CardHeader>
                <CardContent>
                  <DonutChart data={data.behaviorPie} height={220} innerRadius={45} />
                </CardContent>
              </Card>
              <Card className="glass">
                <CardHeader className="pb-2"><CardTitle className="text-base">Intenção de Compra</CardTitle></CardHeader>
                <CardContent>
                  <DonutChart data={data.intentionPie} height={220} innerRadius={45} />
                </CardContent>
              </Card>
              <Card className="glass">
                <CardHeader className="pb-2"><CardTitle className="text-base">Categorias Favoritas</CardTitle></CardHeader>
                <CardContent>
                  <DonutChart data={data.topCategorias} height={220} innerRadius={45} />
                </CardContent>
              </Card>
            </div>

            {data.topCategorias.length > 0 && (
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Top Categorias</CardTitle>
                  <CardDescription>Categorias favoritas dos clientes</CardDescription>
                </CardHeader>
                <CardContent>
                  <HorizontalBarChart data={data.topCategorias} xKey="name" height={250} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Emocional */}
          <TabsContent value="emocional" className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Emoções Predominantes</CardTitle>
                  <CardDescription>Distribuição das emoções dos clientes (últimos 7 dias)</CardDescription>
                </CardHeader>
                <CardContent>
                  {emotionPieData.length > 0 ? (
                    <DonutChart data={emotionPieData} />
                  ) : (
                    <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                      Dados insuficientes
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Distribuição de Emoções</CardTitle>
                  <CardDescription>Todos os clientes</CardDescription>
                </CardHeader>
                <CardContent>
                  {emotionPieData.length > 0 ? (
                    <HorizontalBarChart data={emotionPieData} xKey="name" height={220} />
                  ) : (
                    <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                      Dados insuficientes
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Horários */}
          <TabsContent value="horarios" className="space-y-4">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Interações por Hora do Dia</CardTitle>
                <CardDescription>Quando os clientes mais interagem — otimize o timing dos follow-ups</CardDescription>
              </CardHeader>
              <CardContent>
                {data.hourlyActivity.some(h => h.mensagens > 0) ? (
                  <ColumnChart
                    data={data.hourlyActivity}
                    xKey="hora"
                    bars={[{ key: 'mensagens', color: 'hsl(252 87% 67%)', name: 'Mensagens' }]}
                    height={320}
                  />
                ) : (
                  <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                    Sem dados de atividade nos últimos 30 dias
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vetorial */}
          <TabsContent value="vetorial" className="space-y-4">
            {scatterData.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card className="glass">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Score Emocional vs Probabilidade de Compra</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VectorScatterChart
                      data={scatterData.map(d => ({ ...d, emocao: d.x, compra: d.y }))}
                      xKey="emocao" yKey="compra"
                      xName="Score Emocional" yName="Prob. Compra (%)"
                    />
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Lead Score vs Probabilidade de Compra</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VectorScatterChart
                      data={scatterData.map(d => ({ ...d, score: d.z, compra: d.y }))}
                      xKey="score" yKey="compra"
                      xName="Lead Score" yName="Prob. Compra (%)"
                    />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex flex-col items-center py-20 gap-3">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="text-sm text-muted-foreground">Dados insuficientes para análise vetorial</p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    É necessário ter dados de comportamento dos clientes
                  </p>
                </motion.div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
