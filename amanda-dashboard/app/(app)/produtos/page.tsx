'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Plus, Download, TrendingUp, Eye, MessageSquare, RefreshCw, AlertCircle, Search } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';

interface Produto {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  estoque: number;
  vistos: number;
  citados: number;
  vendidos: number;
  imagem: string | null;
  descricao: string;
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProdutos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/produtos');
      if (!res.ok) throw new Error('Erro ao carregar produtos');
      const json = await res.json();
      setProdutos(json.produtos ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProdutos(); }, [fetchProdutos]);

  const filtered = produtos.filter(p =>
    !searchTerm ||
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const maxVistos = Math.max(...filtered.map(p => p.vistos), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description={`Catálogo de produtos · ${produtos.length} itens ativos`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchProdutos} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Exportar</Button>
            <Button variant="glow" size="sm"><Plus className="h-3.5 w-3.5" /> Novo Produto</Button>
          </div>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Carregando produtos...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center py-20 gap-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchProdutos}>Tentar novamente</Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center py-20 gap-4">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {searchTerm ? 'Nenhum produto encontrado para esta busca' : 'Nenhum produto cadastrado'}
          </p>
        </div>
      )}

      {/* Products grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.5) }}
              className="rounded-xl border border-border glass p-5 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-fuchsia-500/20 overflow-hidden">
                  {p.imagem ? (
                    <img src={p.imagem} alt={p.nome} className="h-full w-full object-cover" />
                  ) : (
                    <ShoppingBag className="h-6 w-6 text-primary" />
                  )}
                </div>
                <Badge
                  variant={p.estoque === 0 ? 'destructive' : p.estoque < 10 ? 'hot' : 'success'}
                  className="text-[10px]"
                >
                  {p.estoque === 0 ? 'Sem estoque' : p.estoque < 10 ? `Baixo: ${p.estoque}` : `Estoque: ${p.estoque}`}
                </Badge>
              </div>

              <h3 className="font-semibold text-sm mb-1 line-clamp-2">{p.nome}</h3>
              {p.descricao && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{p.descricao}</p>
              )}
              <div className="flex items-center gap-2 mb-3">
                {p.categoria && p.categoria !== '—' && (
                  <Badge variant="secondary" className="text-[10px]">{p.categoria}</Badge>
                )}
                <span className="font-bold text-primary">{formatCurrency(p.preco)}</span>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { label: 'Visualizações', value: p.vistos, max: maxVistos, icon: Eye },
                  { label: 'Citações',      value: p.citados, max: maxVistos, icon: MessageSquare },
                  { label: 'Vendidos',      value: p.vendidos, max: maxVistos, icon: TrendingUp },
                ].map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Icon className="h-3 w-3" />{s.label}
                        </span>
                        <span className="font-medium tabular-nums">{s.value}</span>
                      </div>
                      <Progress value={s.max > 0 ? (s.value / s.max) * 100 : 0} className="h-1" />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}

          {/* Add new product card */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border-2 border-dashed border-border p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
          >
            <Plus className="h-8 w-8" />
            <span className="text-sm font-medium">Adicionar Produto</span>
          </motion.button>
        </div>
      )}
    </div>
  );
}
