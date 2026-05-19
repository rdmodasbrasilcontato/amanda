'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image, FileText, Music, File, Trash2, Eye, X } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type MockFile = { id: string; nome: string; tipo: string; tamanho: string; bucket: string; enviado: string; url?: string };

const initialFiles: MockFile[] = [
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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadsPage() {
  const [files, setFiles] = useState<MockFile[]>(initialFiles);
  const [preview, setPreview] = useState<MockFile | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList) => {
    const newFiles: MockFile[] = Array.from(fileList).map(f => {
      const tipo = f.type.startsWith('image') ? 'imagem'
        : f.type.includes('pdf') ? 'pdf'
        : f.type.startsWith('audio') ? 'audio'
        : 'arquivo';
      const url = URL.createObjectURL(f);
      return {
        id: crypto.randomUUID(),
        nome: f.name,
        tipo,
        tamanho: formatBytes(f.size),
        bucket: tipo === 'imagem' ? 'imagens' : tipo === 'audio' ? 'audios' : 'docs',
        enviado: 'agora',
        url,
      };
    });
    setFiles(prev => [...newFiles, ...prev]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handleDelete = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));

  return (
    <div className="space-y-6">
      <PageHeader title="Uploads" description="Arquivos armazenados no Supabase Storage" />

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,application/pdf,audio/*"
        onChange={e => e.target.files && addFiles(e.target.files)}
      />

      <div
        className={`rounded-2xl border-2 border-dashed p-12 text-center transition-all cursor-pointer group ${
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
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
          <AnimatePresence>
            {files.map((f, i) => (
              <motion.div key={f.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-12 items-center px-4 py-3 hover:bg-accent/30 transition-colors">
                <div className="col-span-1">{fileIcon[f.tipo] ?? <File className="h-8 w-8 text-muted-foreground" />}</div>
                <div className="col-span-4 text-sm font-medium truncate pr-4">{f.nome}</div>
                <div className="col-span-2"><Badge variant="secondary" className="text-[10px]">{f.tipo}</Badge></div>
                <div className="col-span-2 text-xs text-muted-foreground font-mono">{f.tamanho}</div>
                <div className="col-span-2 text-xs text-muted-foreground">{f.bucket} · {f.enviado}</div>
                <div className="col-span-1 flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreview(f)} title="Visualizar">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(f.id)} title="Excluir">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {files.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum arquivo enviado ainda</div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      <AnimatePresence>
        {preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-lg w-full mx-4 rounded-2xl border border-border bg-card p-5 shadow-xl">
              <button onClick={() => setPreview(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
              <h3 className="font-bold text-sm mb-3 pr-6 truncate">{preview.nome}</h3>
              {preview.tipo === 'imagem' && preview.url ? (
                <img src={preview.url} alt={preview.nome} className="w-full max-h-80 object-contain rounded-lg" />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  {fileIcon[preview.tipo] ?? <File className="h-12 w-12" />}
                  <p className="text-sm mt-3">{preview.tamanho} · {preview.bucket}</p>
                  <p className="text-xs mt-1 opacity-60">Pré-visualização não disponível para este tipo</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
