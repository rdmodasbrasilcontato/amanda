'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ScrollText, AlertCircle, CheckCircle, Info, AlertTriangle, RefreshCw, Download, Filter } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn, timeAgo } from '@/lib/utils';

type LogLevel = 'info' | 'success' | 'warn' | 'error';

interface LogEntry {
  id: string;
  tipo: string;
  nivel: LogLevel;
  mensagem: string;
  clienteId?: string;
  criadoEm: string;
}

const levelConfig: Record<LogLevel, { icon: any; color: string; badge: any }> = {
  info:    { icon: Info,          color: 'text-info',        badge: 'info'        },
  success: { icon: CheckCircle,   color: 'text-success',     badge: 'success'     },
  warn:    { icon: AlertTriangle, color: 'text-warning',     badge: 'warning'     },
  error:   { icon: AlertCircle,   color: 'text-destructive', badge: 'destructive' },
};

const tipoLabels: Record<string, string> = {
  followup: 'follow-up',
  mensagem: 'mensagem',
  score:    'lead score',
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/logs?limit=200');
      if (!res.ok) throw new Error('Erro ao carregar logs');
      const json = await res.json();
      setLogs(json.logs ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(l => {
    const matchNivel = filter === 'all' || l.nivel === filter;
    const matchTipo  = tipoFilter === 'all' || l.tipo === tipoFilter;
    const matchSearch = !search || l.mensagem.toLowerCase().includes(search.toLowerCase());
    return matchNivel && matchTipo && matchSearch;
  });

  const counts = logs.reduce((acc, l) => {
    acc[l.nivel] = (acc[l.nivel] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Logs do Sistema"
        description="Registros em tempo real de follow-ups, mensagens e lead scores"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        }
      />

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all',     label: `Todos (${logs.length})` },
          { key: 'success', label: `Sucesso (${counts.success ?? 0})` },
          { key: 'info',    label: `Info (${counts.info ?? 0})` },
          { key: 'warn',    label: `Aviso (${counts.warn ?? 0})` },
          { key: 'error',   label: `Erro (${counts.error ?? 0})` },
        ].map(({ key, label }) => (
          <Button key={key} variant="outline" size="sm"
            className={cn(filter === key && 'border-primary bg-primary/10 text-primary')}
            onClick={() => setFilter(key as any)}>
            {label}
          </Button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nos logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {['all', 'followup', 'mensagem', 'score'].map(t => (
          <Button key={t} variant="outline" size="sm"
            className={cn(tipoFilter === t && 'border-info bg-info/10 text-info')}
            onClick={() => setTipoFilter(t)}>
            {t === 'all' ? 'Todos tipos' : tipoLabels[t] ?? t}
          </Button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchLogs}>Tentar novamente</Button>
        </div>
      )}

      <div className="rounded-xl border border-border glass overflow-hidden">
        <div className="bg-muted/30 border-b border-border px-4 py-2 grid grid-cols-12 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          <span className="col-span-1">Nível</span>
          <span className="col-span-2">Horário</span>
          <span className="col-span-2">Tipo</span>
          <span className="col-span-7">Descrição</span>
        </div>
        <div className="divide-y divide-border/50 font-mono text-xs max-h-[calc(100vh-320px)] overflow-y-auto">
          {loading && logs.length === 0 ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 items-center px-4 py-2 animate-pulse gap-2">
                <div className="col-span-1 h-3 w-3 bg-muted rounded-full" />
                <div className="col-span-2 h-3 bg-muted rounded w-16" />
                <div className="col-span-2 h-4 bg-muted rounded w-16" />
                <div className="col-span-7 h-3 bg-muted rounded" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            filtered.map((log, i) => {
              const cfg = levelConfig[log.nivel] ?? levelConfig.info;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.008, 0.2) }}
                  className="grid grid-cols-12 items-center px-4 py-2 hover:bg-accent/30 transition-colors"
                >
                  <div className="col-span-1">
                    <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
                  </div>
                  <div className="col-span-2 text-muted-foreground text-[10px]">
                    {timeAgo(log.criadoEm)}
                  </div>
                  <div className="col-span-2">
                    <Badge variant="secondary" className="text-[9px] uppercase">
                      {tipoLabels[log.tipo] ?? log.tipo}
                    </Badge>
                  </div>
                  <div className={cn('col-span-7 truncate', cfg.color)}>
                    {log.mensagem}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
        {filtered.length > 0 && (
          <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
            {filtered.length} entrada{filtered.length !== 1 ? 's' : ''} — {logs.length} total
          </div>
        )}
      </div>
    </div>
  );
}
