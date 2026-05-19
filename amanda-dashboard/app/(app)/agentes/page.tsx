'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Copy, Play, Pause, Settings, Thermometer, Zap, MessageSquare, Bot } from 'lucide-react';
import { agents, type Agent } from '@/lib/mock-data';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn, formatNumber } from '@/lib/utils';

const providerColors: Record<Agent['provider'], string> = {
  openai:    'from-emerald-500/20 to-green-500/10 text-emerald-400',
  anthropic: 'from-orange-500/20 to-amber-500/10 text-orange-400',
  gemini:    'from-blue-500/20 to-cyan-500/10 text-blue-400',
  grok:      'from-white/10 to-zinc-500/5 text-zinc-300',
  local:     'from-purple-500/20 to-violet-500/10 text-purple-400',
};

const providerLabel: Record<Agent['provider'], string> = {
  openai:    'OpenAI', anthropic: 'Anthropic', gemini: 'Google Gemini',
  grok:      'Grok',  local:     'Local',
};

function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const [active, setActive] = useState(agent.status === 'ativo');
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="relative overflow-hidden rounded-2xl border border-border glass hover:border-primary/30 transition-all group"
    >
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-30 bg-gradient-to-br from-primary to-fuchsia-500" />
      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br', providerColors[agent.provider])}>
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{agent.nome}</h3>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-md bg-gradient-to-r', providerColors[agent.provider])}>
                {providerLabel[agent.provider]} · {agent.modelo}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('relative flex h-2 w-2', active ? '' : 'opacity-40')}>
              {active && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />}
              <span className={cn('relative inline-flex h-2 w-2 rounded-full', active ? 'bg-success' : 'bg-muted-foreground')} />
            </span>
            <span className="text-xs font-medium">{active ? 'Ativo' : 'Pausado'}</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{agent.descricao}</p>

        {/* Personality */}
        <div className="rounded-lg bg-accent/40 border border-border/50 p-3 mb-4">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Personalidade</div>
          <div className="text-sm">{agent.personalidade}</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Prompts', value: agent.prompts, icon: MessageSquare },
            { label: 'Conversas', value: formatNumber(agent.conversas), icon: Zap },
            { label: 'Temperatura', value: agent.temperatura.toFixed(1), icon: Thermometer },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="text-center rounded-lg bg-accent/30 p-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
                <div className="font-bold text-sm tabular-nums">{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Temperature bar */}
        <div className="space-y-1 mb-4">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Temperatura da IA</span>
            <span className="font-mono">{agent.temperatura}</span>
          </div>
          <Progress value={agent.temperatura * 100} className="h-1" />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Preciso</span><span>Criativo</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant={active ? 'outline' : 'default'}
            size="sm"
            className="flex-1"
            onClick={() => setActive(!active)}
          >
            {active ? <><Pause className="h-3.5 w-3.5" /> Pausar</> : <><Play className="h-3.5 w-3.5" /> Ativar</>}
          </Button>
          <Button variant="outline" size="sm"><Copy className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="sm"><Settings className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function AgentesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Agentes IA"
        description="Gerencie os agentes de atendimento inteligente"
        actions={<Button variant="glow" size="sm"><Plus className="h-3.5 w-3.5" /> Novo Agente</Button>}
      />

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total de Agentes', value: agents.length },
          { label: 'Ativos Agora', value: agents.filter(a => a.status === 'ativo').length },
          { label: 'Total Conversas', value: formatNumber(agents.reduce((a, b) => a + b.conversas, 0)) },
          { label: 'Providers', value: new Set(agents.map(a => a.provider)).size },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border glass p-4 text-center">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map((agent, i) => <AgentCard key={agent.id} agent={agent} index={i} />)}

        {/* Add new agent card */}
        <motion.button
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-all p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary group"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-current group-hover:border-primary/50 transition-all">
            <Plus className="h-8 w-8" />
          </div>
          <div className="font-medium text-sm">Criar Novo Agente</div>
          <div className="text-xs text-center">OpenAI · Anthropic · Gemini · Grok · Local</div>
        </motion.button>
      </div>
    </div>
  );
}
