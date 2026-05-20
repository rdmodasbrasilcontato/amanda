'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Construction } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';

export default function CrmPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM"
        description="Visão completa do pipeline e performance de clientes"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-32 gap-6"
      >
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-fuchsia-500/20 border border-primary/20">
            <TrendingUp className="h-12 w-12 text-primary" />
          </div>
          <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-warning/20 border border-warning/30">
            <Construction className="h-4 w-4 text-warning" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">CRM Completo</h2>
          <p className="text-muted-foreground max-w-md text-sm">
            O módulo CRM completo com pipeline de vendas, histórico de compras e análise de valor por cliente estará disponível em breve.
          </p>
        </div>

        <Badge variant="warning" className="text-xs px-3 py-1">Em breve</Badge>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-center">
          {[
            { label: 'Pipeline de vendas', desc: 'Acompanhe oportunidades' },
            { label: 'Histórico de compras', desc: 'Valor total por cliente' },
            { label: 'Segmentação avançada', desc: 'Filtre por RFM e LTV' },
          ].map(f => (
            <div key={f.label} className="rounded-xl border border-border glass p-4 opacity-60">
              <div className="font-medium text-sm mb-1">{f.label}</div>
              <div className="text-xs text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
