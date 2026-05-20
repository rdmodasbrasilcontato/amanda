'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, MessageSquare, Mic, Image, FileText, Link, RefreshCw, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, timeAgo } from '@/lib/utils';

const msgTypeIcon: Record<string, React.ReactNode> = {
  texto:  <MessageSquare className="h-3 w-3" />,
  audio:  <Mic className="h-3 w-3" />,
  imagem: <Image className="h-3 w-3" />,
  pdf:    <FileText className="h-3 w-3" />,
  url:    <Link className="h-3 w-3" />,
};

const emotionEmoji: Record<string, string> = {
  animado: '😊', curioso: '🤔', indeciso: '😕', frustrado: '😠',
  satisfeito: '😌', urgente: '⚡', neutro: '😐',
};

interface Conversa {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string;
  status: string;
  lastMessageAt: string | null;
  messageCount: number;
  handoffActive: boolean;
  emocaoDominante: string;
  leadScore: number;
  intencao: string;
  tags: string[];
}

interface Mensagem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  emotion_detected: string | null;
  created_at: string;
  message_type: string;
}

export default function ConversasPage() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/conversas?limit=50');
      if (!res.ok) throw new Error('Erro ao carregar conversas');
      const json = await res.json();
      const lista: Conversa[] = json.conversas ?? [];
      setConversas(lista);
      if (lista.length > 0 && !selectedId) {
        setSelectedId(lista[0].clienteId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMensagens = useCallback(async (clienteId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/conversas?cliente_id=${clienteId}&limit=1`);
      if (res.ok) {
        const json = await res.json();
        setMensagens(json.mensagens ?? []);
      }
    } catch {}
    setLoadingMsgs(false);
  }, []);

  useEffect(() => { fetchConversas(); }, [fetchConversas]);

  useEffect(() => {
    if (selectedId) fetchMensagens(selectedId);
  }, [selectedId, fetchMensagens]);

  const filtered = conversas.filter(c =>
    !searchTerm ||
    c.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.clienteTelefone.includes(searchTerm)
  );

  const selectedConversa = conversas.find(c => c.clienteId === selectedId);

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      {/* Client list */}
      <div className="w-72 shrink-0 flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversa..."
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchConversas} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {loading && conversas.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Carregando...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-xs text-muted-foreground text-center">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchConversas}>Tentar novamente</Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa'}
            </div>
          ) : filtered.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => setSelectedId(c.clienteId)}
              className={cn(
                'w-full text-left rounded-xl border p-3 transition-all',
                selectedId === c.clienteId ? 'border-primary/40 bg-primary/10' : 'border-border bg-card/40 hover:bg-accent/40'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-500/20 text-xs font-semibold">
                  {(c.clienteNome ?? '?').split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{c.clienteNome.split(' ')[0]}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {c.lastMessageAt ? timeAgo(c.lastMessageAt) : '—'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {emotionEmoji[c.emocaoDominante] ?? '😐'} {c.emocaoDominante} · {c.messageCount} msgs
                  </div>
                </div>
              </div>
              {c.handoffActive && (
                <Badge variant="warning" className="text-[9px] mt-1">Handoff ativo</Badge>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Conversation view */}
      <div className="flex-1 flex flex-col rounded-2xl border border-border glass overflow-hidden">
        {!selectedConversa ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            {loading ? 'Carregando conversas...' : 'Selecione uma conversa'}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-500/20 text-sm font-semibold">
                  {selectedConversa.clienteNome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div className="font-semibold text-sm">{selectedConversa.clienteNome}</div>
                  <div className="text-xs text-muted-foreground">{selectedConversa.clienteTelefone}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedConversa.handoffActive && (
                  <Badge variant="warning" className="text-[10px]">Handoff ativo</Badge>
                )}
                <Badge variant={
                  selectedConversa.emocaoDominante === 'animado' ? 'success' :
                  selectedConversa.emocaoDominante === 'frustrado' ? 'destructive' : 'secondary'
                } className="text-[10px]">
                  {emotionEmoji[selectedConversa.emocaoDominante] ?? '😐'} {selectedConversa.emocaoDominante}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">Score {selectedConversa.leadScore}</Badge>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Carregando mensagens...
                </div>
              ) : mensagens.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Nenhuma mensagem encontrada
                </div>
              ) : mensagens.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.5) }}
                  className={`flex gap-3 ${msg.role === 'assistant' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    msg.role === 'assistant'
                      ? 'bg-gradient-to-br from-primary to-fuchsia-500 text-white'
                      : 'bg-accent text-foreground'
                  )}>
                    {msg.role === 'assistant' ? 'AI' : selectedConversa.clienteNome[0]}
                  </div>
                  <div className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm',
                    msg.role === 'assistant'
                      ? 'bg-primary/15 border border-primary/20 rounded-tr-sm'
                      : 'bg-accent border border-border rounded-tl-sm'
                  )}>
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground">
                      {msgTypeIcon[msg.message_type] ?? msgTypeIcon.texto}
                      <span className="capitalize">{msg.message_type ?? 'texto'}</span>
                      {msg.emotion_detected && <span className="ml-1">{emotionEmoji[msg.emotion_detected] ?? ''}</span>}
                    </div>
                    {msg.content}
                    <div className="text-[10px] text-muted-foreground mt-1 text-right">{timeAgo(msg.created_at)}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input area */}
            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <Input placeholder="Monitorando conversa... (somente leitura)" className="flex-1" disabled />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                As respostas são geradas automaticamente pela Amanda AI · {selectedConversa.messageCount} mensagens no total
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
