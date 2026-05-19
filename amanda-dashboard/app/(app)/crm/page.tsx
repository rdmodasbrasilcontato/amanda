'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, Target, Flame, Thermometer, Snowflake, UserCheck } from 'lucide-react';
import { clients, dashboardKpis } from '@/lib/mock-data';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DonutChart, GrowthAreaChart } from '@/components/charts';
import { leadStatusPie, growthSeries } from '@/lib/mock-data';
import { formatCurrency, timeAgo } from '@/lib/utils';

const topClients = [...clients]
  .sort((a, b) => b.valorTotalGasto - a.valorTotalGasto)
  .slice(0, 8);

export default function CrmPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="CRM" description="Visão completa do pipeline e performance de clientes" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Quentes', value: clients.filter(c => c.status === 'quente').length, icon: Flame, color: 'text-hot' },
          { label: 'Mornos', value: clients.filter(c => c.status === 'morno').length, icon: Thermometer, color: 'text-warm' },
          { label: 'Frios', value: clients.filter(c => c.status === 'frio').length, icon: Snowflake, color: 'text-cold' },
          { label: 'VIP', value: clients.filter(c => c.status === 'vip').length, icon: UserCheck, color: 'text-primary' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border glass p-4 text-center">
              <Icon className={`h-6 w-6 mx-auto mb-2 ${s.color}`} />
              <div className="text-3xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 glass">
          <CardHeader className="pb-2"><CardTitle className="text-base">Evolução do Pipeline</CardTitle></CardHeader>
          <CardContent><GrowthAreaChart data={growthSeries} /></CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2"><CardTitle className="text-base">Distribuição de Leads</CardTitle></CardHeader>
          <CardContent><DonutChart data={leadStatusPie} height={240} innerRadius={55} /></CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Clientes por Valor Total</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {topClients.map((c, i) => (
              <div key={c.id} className="flex items-center gap-4 px-6 py-3 hover:bg-accent/30 transition-colors">
                <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-500/20 text-xs font-semibold shrink-0">
                  {c.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{c.nome}</div>
                  <div className="text-xs text-muted-foreground">{c.cidade} · {c.quantidadeCompras} compras</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 hidden md:block">
                    <Progress value={(c.valorTotalGasto / topClients[0].valorTotalGasto) * 100} className="h-1.5" />
                  </div>
                  <span className="font-mono text-sm font-bold">{formatCurrency(c.valorTotalGasto)}</span>
                  <Badge variant={c.status === 'vip' ? 'default' : c.status === 'quente' ? 'hot' : 'secondary'} className="text-[10px]">
                    {c.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
