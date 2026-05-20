'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Bot, Cpu, Brain, RefreshCw, AlertCircle, Activity, MessageSquare,
  Bell, Zap, Clock, CheckCircle2, Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatNumber, timeAgo } from '@/lib/utils';

interface StatusData {
  database: boolean;
  totalClientes: number;
  followupsPendentes: number;
  conversasAtivas: number;
  mensagens24h: number;
  timestamp: string;
}

const AGENTS = [
  {
    id: 'amanda',
    nome: 'Amanda',
    papel: 'Atendente Principal',
    descricao: 'Agente principal de atendimento. Responde mensagens, detecta emoções, classifica intenções e aciona follow-ups automaticamente.',
    modelo: 'GPT-4o-mini',
    icon: Bot,
    cor: 'from-primary/20 to-fuchsia-500/20',
    bordaCor: 'border-primary/30',
    capacidades: ['Análise emocional', 'Lead scoring', 'Follow-up automático', 'Memória longa', 'Multimodalidade'],
  },
  {
    id: 'scorer',
    nome: 'Lead Scorer',
    papel: 'Motor de Pontuação',
    descricao: 'Calcula e atualiza o score de cada lead em tempo real com base em comportamentos como perguntas, cliques, retorno e urgência.',
    modelo: 'Regras + ML',
    icon: Zap,
    cor: 'from-warning/20 to-orange-500/20',
    bordaCor: 'border-warning/30',
    capacidades: ['17 eventos rastreados', 'Score 0-200', 'Temperatura automática', 'Ranking de leads'],
  },
  {
    id: 'followup',
    nome: 'Follow-up Engine',
    papel: 'Reativação de Leads',
    descricao: 'Agenda e executa follow-ups inteligentes baseados no comportamento e temperatura do lead. Anti-spam integrado.',
    modelo: 'GPT-4o-mini + Cron',
    icon: Bell,
    cor: 'from-info/20 to-cyan-500/20',
    bordaCor: 'border-info/30',
    capacidades: ['Personalização contextual', 'Anti-spam', 'Múltiplas etapas', 'Reativação automática'],
  },
  {
    id: 'memory',
    nome: 'Memory Agent',
    papel: 'Memória de Longo Prazo',
    descricao: 'Armazena preferências, histórico emocional e comportamentos dos clientes para personalizar cada interação futura.',
    modelo: 'Embeddings + PG',
    icon: Brain,
    cor: 'from-success/20 to-emerald-500/20',
    bordaCor: 'border-success/30',
    capacidades: ['Preferências persistentes', 'Histórico comportamental', 'Score emocional', 'Contexto personalizado'],
  },
];

export default function AgentesPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error('Erro ao verificar status');
      const json = await res.json();
      setStatus(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const sistemaOnline = status?.database ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agentes IA"
        description="Motor de inteligência artificial da Amanda — 4 agentes especializados"
        actions={
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        }
      />

      {/* System status bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-4 flex items-center gap-4 ${
          sistemaOnline
            ? 'border-success/30 bg-success/5'
            : 'border-destructive/30 bg-destructive/5'
        }`}
      >
        <div className="relative flex h-3 w-3">
          {sistemaOnline && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          )}
          <span className={`relative inline-flex h-3 w-3 rounded-full ${sistemaOnline ? 'bg-success' : 'bg-destructive'}`} />
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium">
            {loading ? 'Verificando sistema...' : sistemaOnline ? 'Todos os sistemas operacionais' : 'Sistema com problemas — verifique o backend'}
          </span>
          {status && (
            <span className="text-xs text-muted-foreground ml-2">
              · Verificado {timeAgo(status.timestamp)}
            </span>
          )}
        </div>
        {status && (
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span><strong className="text-foreground">{formatNumber(status.mensagens24h)}</strong> msgs/24h</span>
            <span><strong className="text-foreground">{status.conversasAtivas}</strong> conversas ativas</span>
            <span><strong className="text-foreground">{status.followupsPendentes}</strong> fila follow-up</span>
          </div>
        )}
      </motion.div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchStatus}>Tentar novamente</Button>
        </div>
      )}

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AGENTS.map((agent, i) => {
          const Icon = agent.icon;
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className={`glass rounded-2xl border ${agent.bordaCor} h-full`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${agent.cor} border ${agent.bordaCor}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{agent.nome}</CardTitle>
                        <Badge variant="outline" className="text-[10px] font-mono">{agent.modelo}</Badge>
                      </div>
                      <CardDescription className="text-xs mt-0.5">{agent.papel}</CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                      </span>
                      <span className="text-[10px] text-success font-medium">Ativo</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">{agent.descricao}</p>
                  <Separator />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Capacidades</p>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.capacidades.map(cap => (
                        <Badge key={cap} variant="secondary" className="text-[10px] py-0.5">
                          <CheckCircle2 className="h-3 w-3 mr-1 text-success" />
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Live stats */}
      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Clientes',   value: formatNumber(status.totalClientes),    icon: Activity,      color: 'text-primary' },
            { label: 'Mensagens 24h',    value: formatNumber(status.mensagens24h),     icon: MessageSquare, color: 'text-success' },
            { label: 'Conversas Ativas', value: String(status.conversasAtivas),        icon: Sparkles,      color: 'text-info'    },
            { label: 'Fila Follow-up',   value: String(status.followupsPendentes),     icon: Clock,         color: 'text-warning' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.06 }}
                className="rounded-2xl border border-border glass p-4 text-center"
              >
                <Icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
                <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Architecture */}
      <Card className="glass rounded-2xl border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            Arquitetura do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div className="space-y-1">
              <p className="font-medium text-foreground">Backend</p>
              <p>Node.js + TypeScript</p>
              <p>Z-API (WhatsApp)</p>
              <p>OpenAI GPT-4o-mini</p>
              <p>node-cron (agendamento)</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Banco de Dados</p>
              <p>Supabase PostgreSQL</p>
              <p>pgBouncer (pool)</p>
              <p>SSL/TLS habilitado</p>
              <p>Região: sa-east-1</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Dashboard</p>
              <p>Next.js 14 App Router</p>
              <p>TailwindCSS + shadcn/ui</p>
              <p>Recharts + Framer Motion</p>
              <p>Supabase JS SDK</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
