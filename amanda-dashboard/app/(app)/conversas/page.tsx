'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MessageSquare, Mic, Image, FileText, Link, Filter } from 'lucide-react';
import { clients, conversaExemplo } from '@/lib/mock-data';
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

export default function ConversasPage() {
  const [selected, setSelected] = useState(clients[0].id);
  const selectedClient = clients.find(c => c.id === selected)!;

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      {/* Client list */}
      <div className="w-72 shrink-0 flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar conversa..." className="pl-9" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {clients.slice(0, 20).map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => setSelected(c.id)}
              className={cn(
                'w-full text-left rounded-xl border p-3 transition-all',
                selected === c.id ? 'border-primary/40 bg-primary/10' : 'border-border bg-card/40 hover:bg-accent/40'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-500/20 text-xs font-semibold">
                  {c.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{c.nome.split(' ')[0]}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(c.ultimaInteracao)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {emotionEmoji[c.emocaoDominante]} {c.emocaoDominante} · Score {c.leadScore}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Conversation view */}
      <div className="flex-1 flex flex-col rounded-2xl border border-border glass overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-500/20 text-sm font-semibold">
              {selectedClient.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <div className="font-semibold text-sm">{selectedClient.nome}</div>
              <div className="text-xs text-muted-foreground">{selectedClient.cidade} · {selectedClient.telefone}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={
              selectedClient.status === 'quente' ? 'hot' :
              selectedClient.status === 'morno' ? 'warm' : 'secondary'
            } className="text-[10px]">{selectedClient.status}</Badge>
            <Badge variant="secondary" className="text-[10px]">Score {selectedClient.leadScore}</Badge>
            <Button variant="ghost" size="sm"><Filter className="h-3.5 w-3.5" /></Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversaExemplo.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`flex gap-3 ${msg.from === 'amanda' ? 'flex-row-reverse' : ''}`}
            >
              <div className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                msg.from === 'amanda'
                  ? 'bg-gradient-to-br from-primary to-fuchsia-500 text-white'
                  : 'bg-accent text-foreground'
              )}>
                {msg.from === 'amanda' ? 'AI' : selectedClient.nome[0]}
              </div>
              <div className={cn(
                'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm',
                msg.from === 'amanda'
                  ? 'bg-primary/15 border border-primary/20 rounded-tr-sm'
                  : 'bg-accent border border-border rounded-tl-sm'
              )}>
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground">
                  {msgTypeIcon[msg.tipo]}
                  <span className="capitalize">{msg.tipo}</span>
                  {msg.emocao && <span className="ml-1">{emotionEmoji[msg.emocao]}</span>}
                </div>
                {msg.texto}
                <div className="text-[10px] text-muted-foreground mt-1 text-right">{timeAgo(msg.timestamp)}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Input area */}
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <Input placeholder="Monitorando conversa... (somente leitura)" className="flex-1" disabled />
            <Button variant="outline" size="icon"><Mic className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon"><Image className="h-4 w-4" /></Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">As respostas são geradas automaticamente pela Amanda AI</p>
        </div>
      </div>
    </div>
  );
}
