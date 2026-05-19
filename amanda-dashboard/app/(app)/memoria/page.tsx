'use client';

import { motion } from 'framer-motion';
import { Brain, Database, Zap, Clock, Search, Layers, Activity } from 'lucide-react';
import { clients } from '@/lib/mock-data';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { timeAgo } from '@/lib/utils';

const memoriaCurta = clients.slice(0, 8).map(c => ({
  clienteId: c.id,
  clienteNome: c.nome,
  contexto: `Interessada em ${c.categoriaFavorita}. Emoção: ${c.emocaoDominante}. Score: ${c.leadScore}.`,
  ultima: c.ultimaInteracao,
  tokens: Math.floor(Math.random() * 1200) + 200,
}));

const memoriaLonga = clients.slice(0, 12).map(c => ({
  clienteId: c.id,
  clienteNome: c.nome,
  resumo: c.perfilPsicologico,
  interacoes: c.frequencia * 3,
  embeddings: Math.floor(Math.random() * 40) + 5,
  ultima: c.ultimaInteracao,
}));

const vetores = clients.slice(0, 6).map((c, i) => ({
  id: `emb-${i + 1}`,
  texto: `${c.nome}: prefere ${c.categoriaFavorita}, perfil ${c.comportamento}`,
  dimensoes: 1536,
  similaridade: (0.75 + Math.random() * 0.24).toFixed(3),
  modelo: 'text-embedding-3-small',
}));

export default function MemoriaPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Memória IA"
        description="Contexto acumulado, embeddings e vetores de cada cliente"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Search className="h-3.5 w-3.5" /> Busca Semântica</Button>
            <Button variant="glow" size="sm"><Database className="h-3.5 w-3.5" /> Gerenciar Vetores</Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Memórias Curtas', value: memoriaCurta.length, icon: Clock, color: 'text-warning' },
          { label: 'Memórias Longas', value: memoriaLonga.length, icon: Brain, color: 'text-primary' },
          { label: 'Embeddings', value: vetores.reduce((a, _) => a + 1, 0) * 12, icon: Layers, color: 'text-info' },
          { label: 'Total Tokens', value: '248k', icon: Zap, color: 'text-success' },
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Busca semântica nos embeddings..." className="pl-10 max-w-md" />
      </div>

      <Tabs defaultValue="curta">
        <TabsList>
          <TabsTrigger value="curta">Memória Curta</TabsTrigger>
          <TabsTrigger value="longa">Memória Longa</TabsTrigger>
          <TabsTrigger value="embeddings">Embeddings</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
        </TabsList>

        <TabsContent value="curta" className="space-y-2 mt-4">
          {memoriaCurta.map((m, i) => (
            <motion.div key={m.clienteId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-start gap-4 rounded-xl border border-border glass p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-warning/20 to-orange-500/20 text-xs font-semibold">
                {m.clienteNome.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium text-sm">{m.clienteNome}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-[10px] font-mono">{m.tokens} tokens</Badge>
                    <span className="text-xs text-muted-foreground">{timeAgo(m.ultima)}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{m.contexto}</p>
              </div>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="longa" className="space-y-2 mt-4">
          {memoriaLonga.map((m, i) => (
            <motion.div key={m.clienteId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-start gap-4 rounded-xl border border-border glass p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-500/20 text-xs font-semibold">
                {m.clienteNome.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-medium text-sm">{m.clienteNome}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="default" className="text-[10px]">{m.embeddings} embeddings</Badge>
                    <Badge variant="secondary" className="text-[10px]">{m.interacoes} interações</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{m.resumo}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Completude do perfil</span>
                    <span>{Math.floor(60 + Math.random() * 40)}%</span>
                  </div>
                  <Progress value={60 + Math.random() * 40} className="h-1" />
                </div>
              </div>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="embeddings" className="space-y-2 mt-4">
          <div className="rounded-xl border border-border glass overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['ID', 'Texto', 'Modelo', 'Dimensões', 'Similaridade'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vetores.map((v, i) => (
                  <motion.tr key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="border-b border-border/50 hover:bg-accent/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{v.id}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-sm">{v.texto}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{v.modelo}</Badge></td>
                    <td className="px-4 py-3 font-mono text-xs">{v.dimensoes}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={parseFloat(v.similaridade) * 100} className="w-16 h-1.5" />
                        <span className="font-mono text-xs">{v.similaridade}</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="preferencias" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clients.slice(0, 6).map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border glass p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-500/20 text-xs font-semibold">
                    {c.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <span className="font-medium text-sm">{c.nome}</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {[
                    { k: 'Categoria favorita', v: c.categoriaFavorita },
                    { k: 'Comportamento', v: c.comportamento },
                    { k: 'Emoção dominante', v: c.emocaoDominante },
                    { k: 'Intenção dominante', v: c.intencaoDominante },
                  ].map(row => (
                    <div key={row.k} className="flex justify-between">
                      <span className="text-muted-foreground">{row.k}</span>
                      <span className="font-medium capitalize">{row.v}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
