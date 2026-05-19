'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, MapPin, Tag, MessageSquare, ShoppingBag, Brain, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { clients, conversaExemplo } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RadialScore } from '@/components/charts';
import { formatCurrency, formatDateTime, timeAgo } from '@/lib/utils';

const emotionEmoji: Record<string, string> = {
  animado: '😊', curioso: '🤔', indeciso: '😕', frustrado: '😠',
  satisfeito: '😌', urgente: '⚡', neutro: '😐',
};

export default function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const client = clients.find(c => c.id === id);
  if (!client) notFound();

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link href="/clientes">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-xl font-bold">Perfil do Cliente</h1>
      </div>

      {/* Header Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-border glass p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-fuchsia-500/5" />
        <div className="relative flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-2xl font-bold text-white shadow-xl shadow-primary/30">
            {client.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold">{client.nome}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{client.telefone}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{client.cidade}, {client.estado}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm"><MessageSquare className="h-3.5 w-3.5" /> Conversar</Button>
                <Button variant="glow" size="sm"><TrendingUp className="h-3.5 w-3.5" /> Follow-up</Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {client.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-[10px] gap-1">
                  <Tag className="h-2.5 w-2.5" />{tag}
                </Badge>
              ))}
              <Badge variant={
                client.status === 'quente' ? 'hot' :
                client.status === 'morno' ? 'warm' :
                client.status === 'vip' ? 'default' :
                client.status === 'ativo' ? 'success' : 'secondary'
              }>{client.status}</Badge>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scores Row */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Lead Score', value: client.leadScore, color: 'hsl(252 87% 67%)' },
          { label: 'Emocional', value: client.scoreEmocional, color: 'hsl(38 92% 50%)' },
          { label: 'Comportamental', value: client.scoreComportamental, color: 'hsl(199 89% 48%)' },
          { label: 'Engajamento', value: client.scoreEngajamento, color: 'hsl(142 71% 45%)' },
        ].map((s, i) => (
          <Card key={s.label} className="glass flex items-center justify-center p-4">
            <RadialScore value={s.value} label={s.label} color={s.color} size={140} />
          </Card>
        ))}
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="bg-card/60 border border-border">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="ia">Análise IA</TabsTrigger>
        </TabsList>

        {/* ── Informações ─────────────────────────── */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass">
              <CardHeader><CardTitle className="text-sm">Perfil Comportamental</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Comportamento dominante', value: client.comportamento },
                  { label: 'Categoria favorita', value: client.categoriaFavorita },
                  { label: 'Perfil psicológico', value: client.perfilPsicologico },
                  { label: 'Intenção dominante', value: client.intencaoDominante },
                  { label: 'Frequência de interação', value: `${client.frequencia} vezes / mês` },
                  { label: 'Tempo médio de resposta', value: `${Math.floor(client.tempoMedioResposta / 60)}min ${client.tempoMedioResposta % 60}s` },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium text-right max-w-[60%]">{row.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader><CardTitle className="text-sm">Estado Emocional</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                  <span className="text-3xl">{emotionEmoji[client.emocaoDominante]}</span>
                  <div>
                    <div className="font-semibold capitalize">{client.emocaoDominante}</div>
                    <div className="text-xs text-muted-foreground">Emoção dominante</div>
                  </div>
                </div>
                {[
                  { label: 'Intensidade emocional', value: client.intensidadeEmocional },
                  { label: 'Score emocional', value: client.scoreEmocional },
                  { label: 'Probabilidade de compra', value: client.probabilidadeCompra },
                ].map(row => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium">{row.value}%</span>
                    </div>
                    <Progress value={row.value} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Histórico ───────────────────────────── */}
        <TabsContent value="historico">
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">Últimas Mensagens</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {conversaExemplo.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.from === 'amanda' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      msg.from === 'amanda'
                        ? 'bg-gradient-to-br from-primary to-fuchsia-500 text-white'
                        : 'bg-accent text-foreground'
                    }`}>
                      {msg.from === 'amanda' ? 'AI' : client.nome[0]}
                    </div>
                    <div className={`max-w-[70%] rounded-xl p-3 text-sm ${
                      msg.from === 'amanda'
                        ? 'bg-primary/10 border border-primary/20 text-right'
                        : 'bg-accent border border-border'
                    }`}>
                      {msg.texto}
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {timeAgo(msg.timestamp)}
                        {msg.emocao && <span className="ml-1">{emotionEmoji[msg.emocao]}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Compras ─────────────────────────────── */}
        <TabsContent value="compras">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total de Compras', value: `${client.quantidadeCompras}x` },
              { label: 'Valor Total', value: formatCurrency(client.valorTotalGasto) },
              { label: 'Ticket Médio', value: formatCurrency(client.ticketMedio) },
              { label: 'Categoria Fav.', value: client.categoriaFavorita },
            ].map(s => (
              <Card key={s.label} className="glass p-4 text-center">
                <div className="text-2xl font-bold mb-1">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </Card>
            ))}
          </div>
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">Histórico de Compras</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: Math.min(client.quantidadeCompras, 8) }, (_, i) => ({
                  produto: ['Vestido Midi Floral', 'Blusa Cropped', 'Calça Wide Leg', 'Saia Plissada', 'Bolsa Couro'][i % 5],
                  valor: client.ticketMedio * (0.7 + Math.random() * 0.6),
                  data: new Date(Date.now() - (i * 15 + 5) * 86400000).toISOString(),
                })).map((compra, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{compra.produto}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-medium">{formatCurrency(compra.valor)}</div>
                      <div className="text-[10px] text-muted-foreground">{formatDateTime(compra.data)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Análise IA ──────────────────────────── */}
        <TabsContent value="ia">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4" /> Análise Comportamental</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Score Comportamental', value: client.scoreComportamental },
                  { label: 'Score de Engajamento', value: client.scoreEngajamento },
                  { label: 'Probabilidade de Compra', value: client.probabilidadeCompra },
                  { label: 'Intensidade Emocional', value: client.intensidadeEmocional },
                ].map(row => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium tabular-nums">{row.value}%</span>
                    </div>
                    <Progress value={row.value} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4" /> Insights da IA</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { title: 'Perfil detectado', text: client.perfilPsicologico },
                    { title: 'Melhor horário', text: 'Das 19h às 21h — maior taxa de resposta' },
                    { title: 'Gatilho de compra', text: client.probabilidadeCompra > 60 ? 'Novidades e exclusividade' : 'Promoções e descontos' },
                    { title: 'Próxima ação', text: client.leadScore > 60 ? 'Enviar catálogo personalizado' : 'Follow-up leve com vídeo' },
                  ].map(insight => (
                    <div key={insight.title} className="rounded-lg bg-accent/50 border border-border/50 p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-0.5">{insight.title}</div>
                      <div className="text-sm">{insight.text}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
