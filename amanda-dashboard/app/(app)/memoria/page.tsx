'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brain, Database, Clock, Search, Layers, RefreshCw, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { timeAgo } from '@/lib/utils';

interface Memoria {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string;
  tipoMemoria: string;
  conteudo: string;
  relevancia: number;
  criadoEm: string;
}

interface ApiData {
  memorias: Memoria[];
  total: number;
  tiposCount: Record<string, number>;
}

const tipoColors: Record<string, string> = {
  preferencia:  'text-primary',
  comportamento: 'text-info',
  historico:    'text-success',
  emocional:    'text-warning',
  geral:        'text-muted-foreground',
};

export default function MemoriaPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('todas');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchData = useCallback(async (search = '') => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/memoria?${params}`);
      if (!res.ok) throw new Error('Erro ao carregar memórias');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(debouncedSearch); }, [fetchData, debouncedSearch]);

  const memorias = data?.memorias ?? [];

  const filtered = activeTab === 'todas'
    ? memorias
    : memorias.filter(m => m.tipoMemoria === activeTab);

  const tipos = data ? Object.keys(data.tiposCount) : [];
  const totalTipos = tipos.reduce((sum, t) => sum + (data?.tiposCount[t] ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memória IA"
        description={`Contexto acumulado de cada cliente · ${data?.total ?? 0} memórias registradas`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchData(debouncedSearch)} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button variant="glow" size="sm"><Database className="h-3.5 w-3.5" /> Gerenciar</Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Memórias', value: data?.total ?? 0, icon: Brain, color: 'text-primary' },
          { label: 'Tipos Distintos', value: tipos.length, icon: Layers, color: 'text-info' },
          { label: 'Clientes', value: new Set(memorias.map(m => m.clienteId)).size, icon: Clock, color: 'text-warning' },
          { label: 'Nesta página', value: memorias.length, icon: Database, color: 'text-success' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border glass p-4 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar no conteúdo das memórias..."
          className="pl-10"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Carregando memórias...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center py-20 gap-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchData(debouncedSearch)}>Tentar novamente</Button>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main content */}
          <div className="xl:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="todas">Todas ({memorias.length})</TabsTrigger>
                {tipos.slice(0, 4).map(tipo => (
                  <TabsTrigger key={tipo} value={tipo} className="capitalize">
                    {tipo} ({data?.tiposCount[tipo] ?? 0})
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={activeTab} className="space-y-2 mt-4">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    {searchTerm ? 'Nenhuma memória encontrada para esta busca' : 'Nenhuma memória registrada'}
                  </div>
                ) : filtered.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.5) }}
                    className="flex items-start gap-4 rounded-xl border border-border glass p-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-500/20 text-xs font-semibold">
                      {(m.clienteNome ?? '?').split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{m.clienteNome}</span>
                          <Badge variant="secondary" className={`text-[10px] capitalize ${tipoColors[m.tipoMemoria] ?? ''}`}>
                            {m.tipoMemoria}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {m.relevancia > 0 && (
                            <span className="text-[10px] text-muted-foreground">Relevância: {m.relevancia}</span>
                          )}
                          <span className="text-xs text-muted-foreground">{timeAgo(m.criadoEm)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{m.conteudo}</p>
                      {m.clienteTelefone && m.clienteTelefone !== '—' && (
                        <div className="text-[10px] text-muted-foreground mt-1 font-mono">{m.clienteTelefone}</div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Types distribution */}
            {tipos.length > 0 && (
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tipos de Memória</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tipos.map(tipo => {
                    const count = data?.tiposCount[tipo] ?? 0;
                    const pct = totalTipos > 0 ? Math.round((count / totalTipos) * 100) : 0;
                    return (
                      <div key={tipo} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className={`capitalize ${tipoColors[tipo] ?? 'text-muted-foreground'}`}>{tipo}</span>
                          <span className="text-muted-foreground tabular-nums">{count} ({pct}%)</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Top clients with most memories */}
            {memorias.length > 0 && (
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Clientes com mais memórias</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(
                    memorias.reduce((acc: Record<string, { nome: string; count: number }>, m) => {
                      if (!acc[m.clienteId]) acc[m.clienteId] = { nome: m.clienteNome, count: 0 };
                      acc[m.clienteId].count++;
                      return acc;
                    }, {})
                  )
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 5)
                    .map(([clienteId, { nome, count }]) => (
                      <div key={clienteId} className="flex items-center justify-between text-xs">
                        <span className="truncate font-medium">{nome.split(' ')[0]}</span>
                        <Badge variant="secondary" className="text-[10px] ml-2">{count}</Badge>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
