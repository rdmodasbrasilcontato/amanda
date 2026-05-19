'use client';

import { motion } from 'framer-motion';
import { Image, Mic, FileText, Link, Eye, Volume2, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { clients } from '@/lib/mock-data';
import { timeAgo } from '@/lib/utils';

const mockImages = clients.slice(0, 6).map((c, i) => ({
  id: `img-${i}`,
  cliente: c.nome,
  analise: ['Vestido floral rosa, tecido leve, estilo casual.', 'Blusa cropped azul, manga curta, modelagem modern.', 'Calça wide leg bege, cintura alta, estilo contemporâneo.'][i % 3],
  descricao: 'Cliente enviou foto para identificação do produto',
  timestamp: c.ultimaInteracao,
  categoriaDetectada: c.categoriaFavorita,
  confianca: Math.floor(82 + Math.random() * 17),
}));

const mockAudios = clients.slice(0, 5).map((c, i) => ({
  id: `aud-${i}`,
  cliente: c.nome,
  transcricao: ['Oi queria saber se vocês têm aquele vestido rosê que vi no Instagram', 'Quanto custa a blusa cropp de tricô?', 'Vocês fazem entrega para o interior de SP?', 'Quero trocar a calça que comprei semana passada', 'Têm desconto no PIX?'][i],
  duracao: `${Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`,
  timestamp: c.ultimaInteracao,
  emocaoDetectada: c.emocaoDominante,
  modelo: 'whisper-1',
}));

export default function MultimodalPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Multimodal"
        description="Análise de imagens, transcrição de áudios e interpretação de documentos"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Imagens Analisadas', value: '1.284', icon: Image, color: 'text-primary' },
          { label: 'Áudios Transcritos', value: '847', icon: Mic, color: 'text-success' },
          { label: 'PDFs Processados', value: '132', icon: FileText, color: 'text-warning' },
          { label: 'URLs Interpretadas', value: '256', icon: Link, color: 'text-info' },
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

      <Tabs defaultValue="imagens">
        <TabsList>
          <TabsTrigger value="imagens">Imagens</TabsTrigger>
          <TabsTrigger value="audios">Áudios</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="urls">URLs</TabsTrigger>
        </TabsList>

        <TabsContent value="imagens" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {mockImages.map((img, i) => (
              <motion.div key={img.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-border glass overflow-hidden">
                <div className="h-40 bg-gradient-to-br from-primary/10 via-fuchsia-500/5 to-cyan-400/10 flex items-center justify-center">
                  <div className="text-center">
                    <Image className="h-12 w-12 text-muted-foreground/40 mx-auto mb-2" />
                    <span className="text-xs text-muted-foreground">Imagem recebida</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{img.cliente.split(' ')[0]}</span>
                    <Badge variant="secondary" className="text-[10px]">{img.categoriaDetectada}</Badge>
                  </div>
                  <div className="flex items-start gap-2 mb-3">
                    <Eye className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">{img.analise}</p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Confiança: {img.confianca}%</span>
                    <span>{timeAgo(img.timestamp)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audios" className="space-y-3 mt-4">
          {mockAudios.map((audio, i) => (
            <motion.div key={audio.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-start gap-4 rounded-xl border border-border glass p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-success/20 to-emerald-500/20">
                <Volume2 className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="font-medium text-sm">{audio.cliente.split(' ')[0]}</span>
                    <span className="text-xs text-muted-foreground ml-2">· {audio.duracao}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="secondary" className="text-[10px]">{audio.modelo}</Badge>
                    <span className="text-xs text-muted-foreground">{timeAgo(audio.timestamp)}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-accent/50 border border-border/50 p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Transcrição
                  </div>
                  <p className="text-sm">"{audio.transcricao}"</p>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Emoção detectada: <span className="font-medium capitalize">{audio.emocaoDetectada}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <div className="font-medium text-sm text-muted-foreground">PDFs recebidos aparecerão aqui</div>
            <div className="text-xs text-muted-foreground mt-1">A IA extrai e interpreta o conteúdo automaticamente</div>
          </div>
        </TabsContent>

        <TabsContent value="urls" className="mt-4">
          <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
            <Link className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <div className="font-medium text-sm text-muted-foreground">URLs enviadas pelos clientes aparecerão aqui</div>
            <div className="text-xs text-muted-foreground mt-1">A IA acessa, lê e resume o conteúdo da página</div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
