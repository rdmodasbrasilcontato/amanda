'use client';

import { motion } from 'framer-motion';
import { ShoppingBag, Plus, Download, TrendingUp, Eye, MessageSquare } from 'lucide-react';
import { products } from '@/lib/mock-data';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';

export default function ProdutosPage() {
  const maxVistos = Math.max(...products.map(p => p.vistos));
  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Catálogo de produtos com performance de citações e visualizações"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Exportar</Button>
            <Button variant="glow" size="sm"><Plus className="h-3.5 w-3.5" /> Novo Produto</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {products.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="rounded-xl border border-border glass p-5 hover:border-primary/30 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-fuchsia-500/20">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <Badge variant={p.estoque < 10 ? 'hot' : 'success'} className="text-[10px]">
                {p.estoque < 10 ? `Baixo: ${p.estoque}` : `Estoque: ${p.estoque}`}
              </Badge>
            </div>

            <h3 className="font-semibold text-sm mb-1">{p.nome}</h3>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="text-[10px]">{p.categoria}</Badge>
              <span className="font-bold text-primary">{formatCurrency(p.preco)}</span>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { label: 'Visualizações', value: p.vistos, max: maxVistos, icon: Eye },
                { label: 'Citações', value: p.citados, max: maxVistos, icon: MessageSquare },
                { label: 'Vendidos', value: p.vendidos, max: maxVistos, icon: TrendingUp },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="flex items-center gap-1 text-muted-foreground"><Icon className="h-3 w-3" />{s.label}</span>
                      <span className="font-medium tabular-nums">{s.value}</span>
                    </div>
                    <Progress value={(s.value / s.max) * 100} className="h-1" />
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}

        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="rounded-xl border-2 border-dashed border-border p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all">
          <Plus className="h-8 w-8" />
          <span className="text-sm font-medium">Adicionar Produto</span>
        </motion.button>
      </div>
    </div>
  );
}
