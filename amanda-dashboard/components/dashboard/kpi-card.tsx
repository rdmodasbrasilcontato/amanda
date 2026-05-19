'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  accent?: 'primary' | 'success' | 'warning' | 'hot' | 'warm' | 'cold' | 'info';
  suffix?: string;
  prefix?: string;
  index?: number;
}

const accentMap = {
  primary: 'from-primary/20 to-fuchsia-500/10 text-primary',
  success: 'from-success/20 to-emerald-500/10 text-success',
  warning: 'from-warning/20 to-orange-500/10 text-warning',
  hot:     'from-hot/20 to-red-500/10 text-hot',
  warm:    'from-warm/20 to-orange-500/10 text-warm',
  cold:    'from-cold/20 to-sky-500/10 text-cold',
  info:    'from-info/20 to-cyan-500/10 text-info',
};

export function KpiCard({ label, value, change, icon: Icon, accent = 'primary', suffix, prefix, index = 0 }: KpiCardProps) {
  const positive = (change ?? 0) >= 0;
  const display = typeof value === 'number' ? formatNumber(value) : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl p-5 hover:border-primary/30 transition-all"
    >
      <div className={cn('absolute -top-12 -right-12 h-32 w-32 rounded-full blur-3xl opacity-40 bg-gradient-to-br', accentMap[accent])} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
          <div className="text-2xl font-bold tracking-tight tabular-nums">
            {prefix}{display}{suffix}
          </div>
          {typeof change === 'number' && (
            <div className={cn('mt-2 inline-flex items-center gap-1 text-xs font-medium', positive ? 'text-success' : 'text-destructive')}>
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(change).toFixed(1)}%
              <span className="text-muted-foreground font-normal ml-1">vs últ. 30d</span>
            </div>
          )}
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br shrink-0', accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
