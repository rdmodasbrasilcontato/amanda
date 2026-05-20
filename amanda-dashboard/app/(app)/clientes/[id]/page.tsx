'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, MapPin, Tag, MessageSquare, Brain, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDateTime, timeAgo } from '@/lib/utils';

const emotionEmoji: Record<string, string> = {
  animado: '😊', curioso: '🤔', indeciso: '😕', frustrado: '😠',
  satisfeito: '😌', urgente: '⚡', neutro: '😐',
};

interface ClienteDetail {
  id: string;
  nome: string;
  telefone: string;
  cidade: string;
  estado: string;
  email: string | null;
  emocaoRecorrente: string;
  nivelEngajamento: string;
  temperaturaLead: number;
  etapaFunil: string;
  ultimaInteracao: string | null;
  criadoEm: string;
  optOut: boolean;
  bloqueado: boolean;
}

interface Mensagem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  tipo: string;
}

interface Followup {
  id: string;
  tipo: string;
  etapa: string;
  mensagem: string;
  status: string;
  agendadoPara: string | null;
  enviadoEm: string | null;
  criadoEm: string;
}

interface Memoria {
  id: string;
  tipoMemoria: string;
  conteudo: string;
  relevancia: number;
  criadoEm: string;
}

interface ClienteData {
  cliente: ClienteDetail;
  mensagens: Mensagem[];
  followups: Followup[];
  memorias: Memoria[];
}

export default function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ClienteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clienteRes, conversasRes, followupsRes, memoriasRes] = await Promise.all([
        fetch(`/api/clientes/${id}`),
        fetch(`/api/conversas?cliente_id=${id}&limit=50`),
        fetch(`/api/followups?cliente_id=${id}&limit=20`),
        fetch(`/api/memoria?cliente_id=${id}`),
      ]);

      if (!clienteRes.ok) {
        setError('Cliente não encontrado');
        return;
      }

      const clienteJson = await clienteRes.json();
      const conversasJson = conversasRes.ok ? await conversasRes.json() : { mensagens: [] };
      const followupsJson = followupsRes.ok ? await followupsRes.json() : { followups: [] };
      const memoriasJson = memoriasRes.ok ? await memoriasRes.json() : { memorias: [] };

      setData({
        cliente: clienteJson,
        mensagens: conversasJson.mensagens ?? [],
        followups: followupsJson.followups ?? [],
        memorias: memoriasJson.memorias ?? [],
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Carregando perfil...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error ?? 'Erro ao carregar cliente'}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
          </Button>
          <Link href="/clientes">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-3.5 w-3.5" /> Voltar</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { cliente, mensagens, followups, memorias } = data;
  const temperatura = cliente.temperaturaLead ?? 0;
  const status = temperatura >= 81 ? 'VIP' : temperatura >= 51 ? 'Quente' : temperatura >= 21 ? 'Morno' : 'Frio';
  const statusVariant = temperatura >= 81 ? 'default' : temperatura >= 51 ? 'hot' : temperatura >= 21 ? 'warm' : 'secondary';

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link href="/clientes">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-xl font-bold">Perfil do Cliente</h1>
        <Button variant="outline" size="sm" onClick={fetchData} className="ml-auto">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>

      {/* Header Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border glass p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-fuchsia-500/5" />
        <div className="relative flex flex-col sm:flex-row gap-6">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-2xl font-bold text-white shadow-xl shadow-primary/30">
            {cliente.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold">{cliente.nome}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{cliente.telefone}</span>
                  {(cliente.cidade || cliente.estado) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />{[cliente.cidade, cliente.estado].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm"><MessageSquare className="h-3.5 w-3.5" /> Ver Conversa</Button>
                <Button variant="glow" size="sm"><TrendingUp className="h-3.5 w-3.5" /> Follow-up</Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {cliente.nivelEngajamento && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Tag className="h-2.5 w-2.5" />{cliente.nivelEngajamento}
                </Badge>
              )}
              {cliente.etapaFunil && (
                <Badge variant="outline" className="text-[10px]">{cliente.etapaFunil}</Badge>
              )}
              <Badge variant={statusVariant as any}>{status}</Badge>
              {cliente.optOut && <Badge variant="destructive" className="text-[10px]">Opt-out</Badge>}
              {cliente.bloqueado && <Badge variant="destructive" className="text-[10px]">Bloqueado</Badge>}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scores Row */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Temperatura Lead', value: temperatura, color: 'hsl(252 87% 67%)' },
          { label: 'Engajamento', value: 0, color: 'hsl(142 71% 45%)' },
          { label: 'Follow-ups', value: followups.length, color: 'hsl(38 92% 50%)', raw: true },
          { label: 'Mensagens', value: mensagens.length, color: 'hsl(199 89% 48%)', raw: true },
        ].map((s) => (
          <Card key={s.label} className="glass p-4 text-center">
            <div className="text-3xl font-bold mb-1" style={{ color: s.color }}>
              {s.raw ? s.value : `${s.value}%`}
            </div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
            {!s.raw && <Progress value={s.value} className="h-1.5 mt-2" />}
          </Card>
        ))}
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="bg-card/60 border border-border">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="historico">Histórico ({mensagens.length})</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups ({followups.length})</TabsTrigger>
          <TabsTrigger value="memoria">Memória IA ({memorias.length})</TabsTrigger>
        </TabsList>

        {/* Informações */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass">
              <CardHeader><CardTitle className="text-sm">Perfil do Cliente</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Telefone', value: cliente.telefone },
                  { label: 'E-mail', value: cliente.email ?? '—' },
                  { label: 'Nível de engajamento', value: cliente.nivelEngajamento ?? '—' },
                  { label: 'Etapa no funil', value: cliente.etapaFunil ?? '—' },
                  { label: 'Temperatura lead', value: `${temperatura}/100` },
                  { label: 'Última interação', value: cliente.ultimaInteracao ? timeAgo(cliente.ultimaInteracao) : '—' },
                  { label: 'Cliente desde', value: formatDateTime(cliente.criadoEm) },
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
                  <span className="text-3xl">{emotionEmoji[cliente.emocaoRecorrente] ?? '😐'}</span>
                  <div>
                    <div className="font-semibold capitalize">{cliente.emocaoRecorrente ?? 'neutro'}</div>
                    <div className="text-xs text-muted-foreground">Emoção dominante</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Temperatura do lead</span>
                    <span className="font-medium">{temperatura}%</span>
                  </div>
                  <Progress value={temperatura} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="historico">
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">Últimas Mensagens</CardTitle></CardHeader>
            <CardContent>
              {mensagens.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma mensagem encontrada</div>
              ) : (
                <div className="space-y-3">
                  {mensagens.slice(-30).map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'assistant' ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        msg.role === 'assistant'
                          ? 'bg-gradient-to-br from-primary to-fuchsia-500 text-white'
                          : 'bg-accent text-foreground'
                      }`}>
                        {msg.role === 'assistant' ? 'AI' : cliente.nome[0]}
                      </div>
                      <div className={`max-w-[70%] rounded-xl p-3 text-sm ${
                        msg.role === 'assistant'
                          ? 'bg-primary/10 border border-primary/20'
                          : 'bg-accent border border-border'
                      }`}>
                        <div className="text-xs text-muted-foreground mb-1 capitalize">{msg.tipo ?? 'texto'}</div>
                        {msg.content}
                        <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(msg.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-ups */}
        <TabsContent value="followups">
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">Follow-ups do Cliente</CardTitle></CardHeader>
            <CardContent>
              {followups.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">Nenhum follow-up encontrado</div>
              ) : (
                <div className="space-y-3">
                  {followups.map(fu => (
                    <div key={fu.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{fu.tipo}</Badge>
                          {fu.etapa && <span className="text-xs text-muted-foreground">Etapa: {fu.etapa}</span>}
                        </div>
                        <Badge variant={
                          fu.status === 'enviado' ? 'info' :
                          fu.status === 'pendente' ? 'warning' :
                          fu.status === 'cancelado' ? 'secondary' : 'destructive'
                        } className="text-[10px]">{fu.status}</Badge>
                      </div>
                      {fu.mensagem && fu.mensagem !== '—' && (
                        <p className="text-sm italic text-muted-foreground mb-2">"{fu.mensagem}"</p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {fu.agendadoPara ? `Agendado: ${formatDateTime(fu.agendadoPara)}` : `Criado: ${formatDateTime(fu.criadoEm)}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Memória IA */}
        <TabsContent value="memoria">
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4" /> Memória da IA</CardTitle></CardHeader>
            <CardContent>
              {memorias.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma memória registrada para este cliente</div>
              ) : (
                <div className="space-y-3">
                  {memorias.map(m => (
                    <div key={m.id} className="rounded-lg bg-accent/50 border border-border/50 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="secondary" className="text-[10px]">{m.tipoMemoria}</Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">Relevância: {m.relevancia}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(m.criadoEm)}</span>
                        </div>
                      </div>
                      <p className="text-sm">{m.conteudo}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
