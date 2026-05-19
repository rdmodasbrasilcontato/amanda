'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, RefreshCw, Plus, Wifi, WifiOff, QrCode, MessageSquare, Bot, X, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatNumber } from '@/lib/utils';

const providers = [
  { id: 'z-api', name: 'Z-API', desc: 'API não-oficial estável, amplamente usada no Brasil', color: 'from-green-500/20 text-green-400', recommended: true },
  { id: 'evolution', name: 'Evolution API', desc: 'Open source, auto-hospedado, multi-instância', color: 'from-blue-500/20 text-blue-400' },
  { id: 'meta', name: 'Meta Business API', desc: 'API oficial do WhatsApp Business Platform', color: 'from-blue-600/20 text-blue-500' },
  { id: 'ultramsg', name: 'UltraMsg', desc: 'API simples com suporte a envio em massa', color: 'from-purple-500/20 text-purple-400' },
];

function QrCodeModal({ onClose }: { onClose: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/whatsapp?action=qrcode')
      .then(r => r.json())
      .then(d => { setQr(d.qrcode ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative w-80 rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        <h3 className="font-bold text-lg mb-1">Escanear QR Code</h3>
        <p className="text-xs text-muted-foreground mb-4">Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
        <div className="flex items-center justify-center rounded-xl bg-white p-4 min-h-[220px]">
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          ) : qr ? (
            <img src={qr} alt="QR Code" className="w-full max-w-[180px]" />
          ) : (
            <div className="text-center text-sm text-gray-500">
              <WifiOff className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              QR Code indisponível.<br />Verifique se o servidor Amanda está online.
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 text-center">O QR Code expira em 60 segundos</p>
      </motion.div>
    </div>
  );
}

export default function WhatsAppPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);

  const fetchStatus = useCallback(() => {
    setLoading(true);
    fetch('/api/whatsapp?action=status')
      .then(r => r.json())
      .then(d => { setStatus(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const connected = status?.connected ?? false;
  const stats = status?.stats;

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp"
        description="Status da conexão e gerenciamento de instância Z-API"
        actions={
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Atualizar
          </Button>
        }
      />

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Status', value: connected ? 'Conectado' : 'Offline', color: connected ? 'text-success' : 'text-destructive' },
          { label: 'Clientes', value: stats?.total_clientes ?? '—' },
          { label: 'Follow-ups pendentes', value: stats?.followups_pendentes ?? '—' },
          { label: 'Handoffs ativos', value: stats?.handoffs_ativos ?? '—' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border glass p-4 text-center">
            <div className={cn('text-2xl font-bold', s.color ?? '')}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Main instance card */}
      <Card className="glass">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn('flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br',
                connected ? 'from-green-500/20 to-emerald-500/10' : 'from-red-500/20 to-red-500/10')}>
                <Smartphone className={cn('h-7 w-7', connected ? 'text-green-400' : 'text-red-400')} />
              </div>
              <div>
                <h3 className="font-bold text-base">Instância Z-API (Amanda AI)</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={connected ? 'success' : 'destructive'} className="flex items-center gap-1 text-xs">
                    {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                    {connected ? 'Conectado' : 'Desconectado'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Provider: Z-API</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Reconectar
              </Button>
              <Button variant={connected ? 'outline' : 'glow'} size="sm" onClick={() => setShowQr(true)}>
                <QrCode className="h-3.5 w-3.5" /> {connected ? 'Ver QR Code' : 'Escanear QR Code'}
              </Button>
            </div>
          </div>

          {!connected && (
            <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
              WhatsApp desconectado. Clique em "Escanear QR Code" e vincule o número no seu celular.
            </div>
          )}
        </CardContent>
      </Card>

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

      <AnimatePresence>
        {showQr && <QrCodeModal onClose={() => setShowQr(false)} />}
      </AnimatePresence>
    </div>
  );
}
