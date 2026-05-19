'use client';

import { motion } from 'framer-motion';
import { Tag, Plus, TrendingUp } from 'lucide-react';
import { categoryPie } from '@/lib/mock-data';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { DonutChart } from '@/components/charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const cats = [
  { name: 'Vestidos', produtos: 48, clientes: 187, receita: 54288, cor: 'hsl(252 87% 67%)' },
  { name: 'Blusas', produtos: 62, clientes: 165, receita: 26235, cor: 'hsl(199 89% 48%)' },
  { name: 'Calças', produtos: 35, clientes: 142, receita: 31098, cor: 'hsl(173 80% 50%)' },
  { name: 'Saias', produtos: 28, clientes: 121, receita: 21659, cor: 'hsl(38 92% 50%)' },
  { name: 'Acessórios', produtos: 90, clientes: 89, receita: 23961, cor: 'hsl(280 70% 55%)' },
  { name: 'Sapatos', produtos: 44, clientes: 76, receita: 28576, cor: 'hsl(0 84% 60%)' },
];

const maxReceita = Math.max(...cats.map(c => c.receita));

export default function CategoriasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorias"
        description="Performance por categoria de produto"
        actions={<Button variant="glow" size="sm"><Plus className="h-3.5 w-3.5" /> Nova Categoria</Button>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="glass">
          <CardHeader className="pb-2"><CardTitle className="text-base">Distribuição por Categoria</CardTitle></CardHeader>
          <CardContent><DonutChart data={categoryPie} height={280} /></CardContent>
        </Card>

        <div className="xl:col-span-2 space-y-3">
          {cats.map((cat, i) => (
            <motion.div key={cat.name} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
              className="flex items-center gap-4 rounded-xl border border-border glass p-4 hover:border-primary/30 transition-all">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: cat.cor + '20' }}>
                <Tag className="h-5 w-5" style={{ color: cat.cor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{cat.name}</span>
                  <span className="font-mono text-sm font-bold">R$ {(cat.receita / 1000).toFixed(1)}k</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                  <span>{cat.produtos} produtos</span>
                  <span>{cat.clientes} clientes</span>
                </div>
                <Progress value={(cat.receita / maxReceita) * 100} className="h-1.5" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
