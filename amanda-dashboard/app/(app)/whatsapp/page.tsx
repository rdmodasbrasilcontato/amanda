'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, RefreshCw, Plus, Wifi, WifiOff, QrCode, MessageSquare, Bot } from 'lucide-react';
import { whatsappInstances, type WhatsappInstance } from '@/lib/mock-data';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatNumber, timeAgo } from '@/lib/utils';

const providerColors: Record<WhatsappInstance['provider'], string> = {
  'z-api':     'from-green-500/20 to-emerald-500/10 text-green-400',
  'evolution': 'from-blue-500/20 to-cyan-500/10 text-blue-400',
  'meta':      'from-blue-600/20 to-indigo-500/10 text-blue-500',
  'ultramsg':  'from-purple-500/20 to-violet-500/10 text-purple-400',
};

const providerLabel: Record<WhatsappInstance['provider'], string> = {
  'z-api': 'Z-API', 'evolution': 'Evolution API', 'meta': 'Meta API', 'ultramsg': 'UltraMsg',
};

function InstanceCard({ inst, index }: { inst: WhatsappInstance; index: number }) {
  const connected = inst.status === 'conectado';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}
      className="relative overflow-hidden rounded-2xl border border-border glass hover:border-primary/30 transition-all"
    >
      <div className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', connected ? 'from-success to-emerald-400' : 'from-destructive to-red-400')} />
      <div className="p-5 pt-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br', providerColors[inst.provider])}>
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm">{inst.nome}</h3>
              <div className="font-mono text-xs text-muted-foreground">{inst.numero}</div>
            </div>
          </div>
          <Badge variant={connected ? 'success' : 'destructive'} className="flex items-center gap-1">
            {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {connected ? 'Conectado' : 'Offline'}
          </Badge>
        </div>

        {/* Provider badge */}
        <div className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-gradient-to-r mb-4', providerColors[inst.provider])}>
          {providerLabel[inst.provider]}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-accent/40 p-3 text-center">
            <MessageSquare className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <div className="font-bold text-lg tabular-nums">{formatNumber(inst.mensagensHoje)}</div>
            <div className="text-[10px] text-muted-foreground">Msg hoje</div>
          </div>
          <div className="rounded-lg bg-accent/40 p-3 text-center">
            <Bot className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <div className="font-bold text-sm truncate">{inst.agenteAtribuido}</div>
            <div className="text-[10px] text-muted-foreground">Agente</div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mb-4">
          Última conexão: {timeAgo(inst.ultimaConexao)}
        </div>

        {/* Actions */}
        {connected ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1"><RefreshCw className="h-3.5 w-3.5" /> Reconectar</Button>
            <Button variant="outline" size="sm" className="flex-1">Trocar Sessão</Button>
          </div>
        ) : (
          <Button variant="glow" size="sm" className="w-full">
            <QrCode className="h-3.5 w-3.5" /> Escanear QR Code
          </Button>
        )}
      </div>
    </motion.div>
  );
}

const providers = [
  { id: 'z-api', name: 'Z-API', desc: 'API não-oficial estável, amplamente usada no Brasil', color: 'from-green-500/20 text-green-400', recommended: true },
  { id: 'evolution', name: 'Evolution API', desc: 'Open source, auto-hospedado, multi-instância', color: 'from-blue-500/20 text-blue-400' },
  { id: 'meta', name: 'Meta Business API', desc: 'API oficial do WhatsApp Business Platform', color: 'from-blue-600/20 text-blue-500' },
  { id: 'ultramsg', name: 'UltraMsg', desc: 'API simples com suporte a envio em massa', color: 'from-purple-500/20 text-purple-400' },
];

export default function WhatsAppPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp APIs"
        description="Gerencie instâncias e conexões WhatsApp"
        actions={<Button variant="glow" size="sm"><Plus className="h-3.5 w-3.5" /> Nova Instância</Button>}
      />

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Instâncias', value: whatsappInstances.length },
          { label: 'Conectadas', value: whatsappInstances.filter(i => i.status === 'conectado').length, color: 'text-success' },
          { label: 'Mensagens Hoje', value: formatNumber(whatsappInstances.reduce((a, b) => a + b.mensagensHoje, 0)) },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border glass p-4 text-center">
            <div className={cn('text-2xl font-bold', s.color ?? '')}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Instance cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {whatsappInstances.map((inst, i) => <InstanceCard key={inst.id} inst={inst} index={i} />)}

        <motion.button
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-all p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary"
        >
          <Plus className="h-8 w-8" />
          <div className="font-medium text-sm">Adicionar Instância</div>
        </motion.button>
      </div>

      {/* Providers */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Providers Suportados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {providers.map(p => (
              <div key={p.id} className={cn('rounded-xl border border-border p-4 bg-gradient-to-br', p.color, 'bg-opacity-10')}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm">{p.name}</div>
                  {p.recommended && <Badge variant="default" className="text-[9px]">Recomendado</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{p.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
