'use client';

import { Search, Bell, Command, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl px-6">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Buscar clientes, conversas, produtos..."
          className="h-10 w-full rounded-lg border border-border bg-card/50 pl-10 pr-16 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          <Command className="h-3 w-3" />K
        </kbd>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Button variant="glow" size="sm">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px]">
            3
          </Badge>
        </Button>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 pl-1 pr-2 py-1 cursor-pointer hover:bg-accent transition-colors">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px]">RD</AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <div className="text-xs font-medium leading-none">RD Modas</div>
            <div className="text-[10px] text-muted-foreground">admin@rdmodas.com</div>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
}
