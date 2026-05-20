'use client';

import { motion } from 'framer-motion';
import { Bot, Construction } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';

export default function AgentesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Agentes IA"
        description="Gerencie os agentes de atendimento inteligente"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-32 gap-6"
      >
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-fuchsia-500/20 border border-primary/20">
            <Bot className="h-12 w-12 text-primary" />
          </div>
          <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-warning/20 border border-warning/30">
            <Construction className="h-4 w-4 text-warning" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Agentes IA</h2>
          <p className="text-muted-foreground max-w-md text-sm">
            O gerenciamento de agentes estará disponível em breve. Esta funcionalidade permitirá criar e configurar múltiplos agentes de IA com diferentes personalidades e modelos.
          </p>
        </div>

        <Badge variant="warning" className="text-xs px-3 py-1">Em breve</Badge>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-center">
          {[
            { label: 'Multi-agente', desc: 'OpenAI, Anthropic, Gemini, Grok' },
            { label: 'Personalidades', desc: 'Configure comportamento e tom' },
            { label: 'Monitoramento', desc: 'Métricas em tempo real' },
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
