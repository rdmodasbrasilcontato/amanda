'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  getPaginationRowModel, flexRender,
  type ColumnDef, type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Download, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { type Client } from '@/lib/mock-data';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn, formatCurrency, timeAgo } from '@/lib/utils';

const statusConfig: Record<string, { label: string; variant: any }> = {
  frio:   { label: 'Frio',   variant: 'cold' },
  morno:  { label: 'Morno',  variant: 'warm' },
  quente: { label: 'Quente', variant: 'hot'  },
  vip:    { label: 'VIP',    variant: 'default' },
};

const emotionEmoji: Record<string, string> = {
  animado: '😊', curioso: '🤔', indeciso: '😕', frustrado: '😠',
  satisfeito: '😌', urgente: '⚡', neutro: '😐',
};

const PAGE_LIMIT = 50;
type StatusFilter = 'quente' | 'morno' | 'frio' | 'vip' | '';

export default function ClientesPage() {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');

  // API state
  const [apiClientes, setApiClientes] = useState<Client[]>([]);
  const [apiTotal, setApiTotal] = useState(0);
  const [apiPage, setApiPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientes = useCallback(async (page: number, search: string, status: StatusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const res = await fetch(`/api/clientes?${params}`);
      if (!res.ok) throw new Error('Erro ao carregar clientes');
      const json = await res.json();
      setApiClientes(json.clientes ?? []);
      setApiTotal(json.total ?? 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setApiPage(1);
      fetchClientes(1, searchInput, statusFilter);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput, statusFilter, fetchClientes]);

  useEffect(() => {
    fetchClientes(apiPage, searchInput, statusFilter);
  }, [apiPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo<ColumnDef<Client>[]>(() => [
    {
      id: 'cliente',
      header: 'Cliente',
      accessorFn: (r) => r.nome,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-3 min-w-[180px]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-fuchsia-500/20 text-xs font-semibold">
              {(c.nome ?? '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <div className="font-medium text-sm leading-none mb-0.5">{c.nome}</div>
              <div className="text-[11px] text-muted-foreground font-mono">{c.telefone}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'leadScore',
      header: ({ column }) => (
        <button className="flex items-center gap-1.5 font-medium" onClick={() => column.toggleSorting()}>
          Score
          {column.getIsSorted() === 'asc' ? <ArrowUp className="h-3 w-3" /> :
           column.getIsSorted() === 'desc' ? <ArrowDown className="h-3 w-3" /> :
           <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </button>
      ),
      cell: ({ row }) => (
        <div className="w-20">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium">{row.original.leadScore}</span>
          </div>
          <Progress value={row.original.leadScore} className="h-1.5" />
        </div>
      ),
    },
    {
      accessorKey: 'emocaoDominante',
      header: 'Emoção',
      cell: ({ row }) => (
        <span className="text-sm">
          {emotionEmoji[row.original.emocaoDominante] ?? '😐'} {row.original.emocaoDominante}
        </span>
      ),
    },
    {
      accessorKey: 'comportamento',
      header: 'Comportamento',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.comportamento}</span>,
    },
    {
      accessorKey: 'categoriaFavorita',
      header: 'Categoria',
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-[10px]">{row.original.categoriaFavorita}</Badge>
      ),
    },
    {
      accessorKey: 'ticketMedio',
      header: ({ column }) => (
        <button className="flex items-center gap-1.5 font-medium" onClick={() => column.toggleSorting()}>
          Ticket Médio
          {column.getIsSorted() === 'asc' ? <ArrowUp className="h-3 w-3" /> :
           column.getIsSorted() === 'desc' ? <ArrowDown className="h-3 w-3" /> :
           <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </button>
      ),
      cell: ({ row }) => <span className="font-mono text-sm font-medium">{formatCurrency(row.original.ticketMedio)}</span>,
    },
    {
      accessorKey: 'ultimaInteracao',
      header: 'Última Int.',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{timeAgo(row.original.ultimaInteracao)}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = statusConfig[row.original.status] ?? { label: row.original.status, variant: 'secondary' };
        return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
      },
    },
  ], []);

  const table = useReactTable({
    data: apiClientes,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_LIMIT } },
    manualPagination: true,
    pageCount: Math.ceil(apiTotal / PAGE_LIMIT),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description={`${apiTotal} clientes encontrados`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchClientes(apiPage, searchInput, statusFilter)} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Exportar</Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm"><Filter className="h-3.5 w-3.5" /> Filtros</Button>
        {(['quente', 'morno', 'frio', 'vip'] as StatusFilter[]).map(s => (
          <Button
            key={s}
            variant="outline"
            size="sm"
            className={cn(statusFilter === s && 'border-primary bg-primary/10 text-primary')}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
          >
            {statusConfig[s].label}
          </Button>
        ))}
        {statusFilter && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter('')}>
            Limpar filtro
          </Button>
        )}
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="flex flex-col items-center py-12 gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchClientes(apiPage, searchInput, statusFilter)}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Table */}
      {!error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id} className="border-b border-border bg-muted/30">
                    {hg.headers.map(h => (
                      <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin" /> Carregando clientes...
                      </div>
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      Nenhum cliente encontrado
                    </td>
                  </tr>
                ) : table.getRowModel().rows.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.015, 0.5) }}
                    className="border-b border-border/50 hover:bg-accent/40 transition-colors cursor-pointer"
                    onClick={() => router.push(`/clientes/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Página {apiPage} de {Math.max(1, Math.ceil(apiTotal / PAGE_LIMIT))} · {apiTotal} clientes
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="outline" size="sm"
                onClick={() => setApiPage(p => Math.max(1, p - 1))}
                disabled={apiPage <= 1 || loading}
              >Anterior</Button>
              <Button
                variant="outline" size="sm"
                onClick={() => setApiPage(p => p + 1)}
                disabled={apiPage >= Math.ceil(apiTotal / PAGE_LIMIT) || loading}
              >Próximo</Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
