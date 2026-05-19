'use client';

import { motion } from 'framer-motion';
import { Plug, CheckCircle2, XCircle, Settings, Plus } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const integrations = [
  { id: 'openai', name: 'OpenAI', desc: 'GPT-4o, Whisper, Embeddings, TTS', status: 'conectado', category: 'IA' },
  { id: 'supabase', name: 'Supabase', desc: 'PostgreSQL + pgvector + Storage', status: 'conectado', category: 'Database' },
  { id: 'zapi', name: 'Z-API', desc: 'WhatsApp Business API (não-oficial)', status: 'conectado', category: 'WhatsApp' },
  { id: 'redis', name: 'Redis', desc: 'Cache de sessões e debounce', status: 'conectado', category: 'Cache' },
  { id: 'evolution', name: 'Evolution API', desc: 'WhatsApp multi-instância open source', status: 'desconectado', category: 'WhatsApp' },
  { id: 'gemini', name: 'Google Gemini', desc: 'Modelo alternativo de IA', status: 'desconectado', category: 'IA' },
  { id: 'sentry', name: 'Sentry', desc: 'Monitoramento de erros em produção', status: 'desconectado', category: 'Observabilidade' },
  { id: 'meta', name: 'Meta Business API', desc: 'WhatsApp Business Platform oficial', status: 'desconectado', category: 'WhatsApp' },
];

const categories = ['Todos', 'IA', 'WhatsApp', 'Database', 'Cache', 'Observabilidade'];

export default function IntegracoesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrações"
        description="Gerencie todas as conexões externas do sistema"
        actions={<Button variant="glow" size="sm"><Plus className="h-3.5 w-3.5" /> Nova Integração</Button>}
      />

      <div className="flex flex-wrap gap-2">
        {categories.map(c => (
          <Button key={c} variant="outline" size="sm">{c}</Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {integrations.map((intg, i) => (
          <motion.div key={intg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-border glass p-5 hover:border-primary/30 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-fuchsia-500/10">
                <Plug className="h-6 w-6 text-primary" />
              </div>
              {intg.status === 'conectado'
                ? <CheckCircle2 className="h-5 w-5 text-success" />
                : <XCircle className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-semibold text-sm">{intg.name}</h3>
              <Badge variant="secondary" className="text-[9px]">{intg.category}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{intg.desc}</p>
            <div className="flex items-center justify-between">
              <Badge variant={intg.status === 'conectado' ? 'success' : 'secondary'} className="text-[10px]">
                {intg.status === 'conectado' ? 'Conectado' : 'Desconectado'}
              </Badge>
              <Button variant="ghost" size="sm"><Settings className="h-3.5 w-3.5" /></Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
