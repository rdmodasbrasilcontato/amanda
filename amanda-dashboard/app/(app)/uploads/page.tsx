'use client';

import { motion } from 'framer-motion';
import { Upload, Image, FileText, Music, File, Trash2, Eye, Download } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const mockFiles = [
  { id: 'f1', nome: 'catalogo-verao-2024.pdf', tipo: 'pdf', tamanho: '4.2 MB', bucket: 'docs', enviado: '3d atrás' },
  { id: 'f2', nome: 'vestido-midi-floral.jpg', tipo: 'imagem', tamanho: '1.8 MB', bucket: 'imagens', enviado: '5d atrás' },
  { id: 'f3', nome: 'audio-cliente-maria.ogg', tipo: 'audio', tamanho: '0.4 MB', bucket: 'audios', enviado: '1d atrás' },
  { id: 'f4', nome: 'blusa-cropp-azul.jpg', tipo: 'imagem', tamanho: '2.1 MB', bucket: 'imagens', enviado: '7d atrás' },
  { id: 'f5', nome: 'lookbook-inverno.pdf', tipo: 'pdf', tamanho: '8.7 MB', bucket: 'docs', enviado: '12d atrás' },
];

const fileIcon: Record<string, React.ReactNode> = {
  pdf:    <FileText className="h-8 w-8 text-red-400" />,
  imagem: <Image className="h-8 w-8 text-blue-400" />,
  audio:  <Music className="h-8 w-8 text-green-400" />,
};

export default function UploadsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Uploads" description="Arquivos armazenados no Supabase Storage" />

      <div
        className="rounded-2xl border-2 border-dashed border-border p-12 text-center hover:border-primary/50 transition-all cursor-pointer group"
        onClick={() => {}}
      >
        <Upload className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3 group-hover:text-primary transition-colors" />
        <div className="font-medium text-sm mb-1">Arraste arquivos ou clique para enviar</div>
        <div className="text-xs text-muted-foreground">PDF, imagens, áudios · Máx. 50MB</div>
      </div>

      <div className="rounded-xl border border-border glass overflow-hidden">
        <div className="bg-muted/30 border-b border-border px-4 py-2.5 grid grid-cols-12 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          <span className="col-span-1"></span>
          <span className="col-span-4">Nome</span>
          <span className="col-span-2">Tipo</span>
          <span className="col-span-2">Tamanho</span>
          <span className="col-span-2">Bucket</span>
          <span className="col-span-1"></span>
        </div>
        <div className="divide-y divide-border/50">
          {mockFiles.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="grid grid-cols-12 items-center px-4 py-3 hover:bg-accent/30 transition-colors">
              <div className="col-span-1">{fileIcon[f.tipo] ?? <File className="h-8 w-8 text-muted-foreground" />}</div>
              <div className="col-span-4 text-sm font-medium truncate pr-4">{f.nome}</div>
              <div className="col-span-2"><Badge variant="secondary" className="text-[10px]">{f.tipo}</Badge></div>
              <div className="col-span-2 text-xs text-muted-foreground font-mono">{f.tamanho}</div>
              <div className="col-span-2 text-xs text-muted-foreground">{f.bucket} · {f.enviado}</div>
              <div className="col-span-1 flex gap-1 justify-end">
                <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
