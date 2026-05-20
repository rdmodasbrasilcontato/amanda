'use client';

import { motion } from 'framer-motion';
import { Kanban, Construction } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';

export default function KanbanPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Kanban CRM"
        description="Visualize e gerencie clientes por estágio"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-32 gap-6"
      >
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-fuchsia-500/20 border border-primary/20">
            <Kanban className="h-12 w-12 text-primary" />
          </div>
          <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-warning/20 border border-warning/30">
            <Construction className="h-4 w-4 text-warning" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Kanban CRM</h2>
          <p className="text-muted-foreground max-w-md text-sm">
            O quadro Kanban para gestão visual de leads estará disponível em breve. Arraste e solte clientes entre as etapas do funil de vendas.
          </p>
        </div>

        <Badge variant="warning" className="text-xs px-3 py-1">Em breve</Badge>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-center">
          {[
            { label: 'Drag & Drop', desc: 'Mova clientes entre etapas' },
            { label: 'Pipeline visual', desc: 'Novos, mornos, quentes, VIP' },
            { label: 'Atualização real', desc: 'Sincronizado com Supabase' },
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
