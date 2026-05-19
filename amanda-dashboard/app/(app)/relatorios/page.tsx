'use client';

import { motion } from 'framer-motion';
import { FileBarChart, Download, Calendar, TrendingUp, Users, DollarSign, Bell } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ColumnChart, GrowthAreaChart, GroupedBarChart } from '@/components/charts';
import { growthSeries, salesBars, followupBars } from '@/lib/mock-data';

const reports = [
  { id: 'diario', label: 'Diário', desc: 'Resumo do dia atual', icon: Calendar, badge: 'Hoje' },
  { id: 'semanal', label: 'Semanal', desc: 'Últimos 7 dias', icon: Calendar, badge: 'Semana' },
  { id: 'mensal', label: 'Mensal', desc: 'Últimos 30 dias', icon: Calendar, badge: 'Mês' },
  { id: 'anual', label: 'Anual', desc: '12 meses correntes', icon: Calendar, badge: 'Ano' },
];

const summaryMetrics = [
  { label: 'Novos Clientes', value: '47', change: '+12%', icon: Users, color: 'text-primary' },
  { label: 'Total Vendas', value: '128', change: '+8%', icon: TrendingUp, color: 'text-success' },
  { label: 'Receita Estimada', value: 'R$ 36.8k', change: '+15%', icon: DollarSign, color: 'text-warning' },
  { label: 'Follow-ups', value: '384', change: '-3%', icon: Bell, color: 'text-info' },
];

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Relatórios completos de performance e comportamento"
        actions={<Button variant="glow" size="sm"><Download className="h-3.5 w-3.5" /> Exportar PDF</Button>}
      />

      <Tabs defaultValue="mensal">
        <TabsList>
          {reports.map(r => (
            <TabsTrigger key={r.id} value={r.id}>{r.label}</TabsTrigger>
          ))}
        </TabsList>

        {reports.map(r => (
          <TabsContent key={r.id} value={r.id} className="space-y-6 mt-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">{r.badge} · Atualizado agora</Badge>
              <div className="flex gap-2">
                <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> CSV</Button>
                <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> XLSX</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {summaryMetrics.map((m, i) => {
                const Icon = m.icon;
                return (
                  <motion.div key={m.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-border glass p-4">
                    <Icon className={`h-4 w-4 mb-2 ${m.color}`} />
                    <div className="text-2xl font-bold mb-0.5">{m.value}</div>
                    <div className="text-xs text-muted-foreground">{m.label}</div>
                    <Badge variant={m.change.startsWith('+') ? 'success' : 'destructive'} className="mt-1 text-[10px]">{m.change}</Badge>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card className="glass">
                <CardHeader className="pb-2"><CardTitle className="text-base">Crescimento de Clientes</CardTitle></CardHeader>
                <CardContent><GrowthAreaChart data={growthSeries} height={220} /></CardContent>
              </Card>
              <Card className="glass">
                <CardHeader className="pb-2"><CardTitle className="text-base">Vendas por Período</CardTitle></CardHeader>
                <CardContent><ColumnChart data={salesBars} height={220} /></CardContent>
              </Card>
              <Card className="glass xl:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-base">Follow-ups Semanais</CardTitle></CardHeader>
                <CardContent><GroupedBarChart data={followupBars} height={200} /></CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
