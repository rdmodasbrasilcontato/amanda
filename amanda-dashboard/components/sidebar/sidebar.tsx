'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Briefcase, KanbanSquare, Bell, BarChart3, Bot, FileText,
  MessageSquare, Brain, ShoppingBag, Tag, Sparkles, Smartphone, Plug, FileBarChart,
  Upload, ScrollText, Settings, Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users, badge: '247' },
  { href: '/crm', label: 'CRM', icon: Briefcase },
  { href: '/kanban', label: 'Kanban', icon: KanbanSquare },
  { href: '/followups', label: 'Follow-ups', icon: Bell, badge: '12' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/agentes', label: 'Agentes', icon: Bot },
  { href: '/prompts', label: 'Prompts', icon: FileText },
  { href: '/conversas', label: 'Conversas', icon: MessageSquare },
  { href: '/memoria', label: 'Memória IA', icon: Brain },
  { href: '/produtos', label: 'Produtos', icon: ShoppingBag },
  { href: '/categorias', label: 'Categorias', icon: Tag },
  { href: '/multimodal', label: 'Multimodal', icon: Sparkles },
  { href: '/whatsapp', label: 'WhatsApp APIs', icon: Smartphone, badge: '3' },
  { href: '/integracoes', label: 'Integrações', icon: Plug },
  { href: '/relatorios', label: 'Relatórios', icon: FileBarChart },
  { href: '/uploads', label: 'Uploads', icon: Upload },
  { href: '/logs', label: 'Logs', icon: ScrollText },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-6 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-fuchsia-500 shadow-lg shadow-primary/30">
          <Cpu className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-sm tracking-tight">Amanda AI</div>
          <div className="text-[10px] text-muted-foreground font-mono">v1.0.0</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-y-1 left-0 w-1 rounded-r-full bg-gradient-to-b from-primary to-fuchsia-500"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={cn('h-4 w-4 shrink-0 transition-transform', active && 'scale-110')} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <Badge variant={active ? 'default' : 'secondary'} className="h-5 px-1.5 text-[10px]">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Status footer */}
      <div className="border-t border-border p-3">
        <div className="rounded-lg bg-gradient-to-br from-primary/10 via-fuchsia-500/5 to-cyan-400/10 border border-primary/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
            </span>
            <span className="text-xs font-medium">Sistema Online</span>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">
            Uptime: 99.98% · 3 agentes ativos
          </div>
        </div>
      </div>
    </aside>
  );
}
