'use client';

import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadialBarChart, RadialBar,
} from 'recharts';

const chartTheme = {
  grid: 'hsl(240 6% 14%)',
  axis: 'hsl(240 5% 64.9%)',
  tooltip: {
    backgroundColor: 'hsl(240 8% 6%)',
    border: '1px solid hsl(240 6% 14%)',
    borderRadius: '0.5rem',
    boxShadow: '0 10px 30px -10px hsl(0 0% 0% / 0.5)',
    padding: '8px 12px',
  },
};

interface LineProps { data: any[]; dataKey?: string; height?: number; series?: { key: string; color: string; name?: string }[] }

export function GrowthAreaChart({ data, height = 280, series }: LineProps) {
  const lines = series ?? [
    { key: 'clientes', color: 'hsl(252 87% 67%)', name: 'Clientes' },
    { key: 'mensagens', color: 'hsl(199 89% 48%)', name: 'Mensagens' },
    { key: 'conversoes', color: 'hsl(142 71% 45%)', name: 'Conversões' },
  ];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          {lines.map(s => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis dataKey="date" stroke={chartTheme.axis} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={chartTheme.axis} fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={chartTheme.tooltip} cursor={{ stroke: 'hsl(252 87% 67%)', strokeWidth: 1, strokeDasharray: '4 4' }} />
        {lines.map(s => (
          <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} fill={`url(#grad-${s.key})`} name={s.name} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MultiLineChart({ data, height = 280, series }: LineProps) {
  const lines = series ?? [
    { key: 'animado', color: 'hsl(252 87% 67%)' },
    { key: 'curioso', color: 'hsl(199 89% 48%)' },
    { key: 'satisfeito', color: 'hsl(142 71% 45%)' },
    { key: 'frustrado', color: 'hsl(0 84% 60%)' },
  ];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis dataKey="dia" stroke={chartTheme.axis} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={chartTheme.axis} fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={chartTheme.tooltip} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
        {lines.map(s => (
          <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

const DEFAULT_COLORS = [
  'hsl(252 87% 67%)', 'hsl(199 89% 48%)', 'hsl(142 71% 45%)', 'hsl(38 92% 50%)',
  'hsl(0 84% 60%)', 'hsl(280 80% 60%)', 'hsl(160 60% 45%)', 'hsl(220 70% 55%)',
];

interface PieProps { data: { name: string; value: number; color?: string }[]; height?: number; innerRadius?: number }

export function DonutChart({ data, height = 260, innerRadius = 60 }: PieProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={Math.max(innerRadius + 30, 90)}
          paddingAngle={3}
          strokeWidth={0}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={chartTheme.tooltip} />
        <Legend
          verticalAlign="middle"
          align="right"
          layout="vertical"
          iconType="circle"
          wrapperStyle={{ fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface BarProps { data: any[]; height?: number; bars?: { key: string; color: string; name?: string }[]; xKey?: string }

export function GroupedBarChart({ data, height = 280, bars, xKey = 'dia' }: BarProps) {
  const items = bars ?? [
    { key: 'enviados', color: 'hsl(252 87% 67%)', name: 'Enviados' },
    { key: 'respondidos', color: 'hsl(142 71% 45%)', name: 'Respondidos' },
  ];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis dataKey={xKey} stroke={chartTheme.axis} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={chartTheme.axis} fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={chartTheme.tooltip} cursor={{ fill: 'hsl(252 87% 67% / 0.05)' }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
        {items.map(b => (
          <Bar key={b.key} dataKey={b.key} fill={b.color} radius={[6, 6, 0, 0]} name={b.name} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ColumnChart({ data, height = 280, bars, xKey = 'mes' }: BarProps) {
  const items = bars ?? [{ key: 'vendas', color: 'hsl(252 87% 67%)', name: 'Vendas' }];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(252 87% 67%)" />
            <stop offset="100%" stopColor="hsl(280 80% 60%)" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis dataKey={xKey} stroke={chartTheme.axis} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={chartTheme.axis} fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={chartTheme.tooltip} cursor={{ fill: 'hsl(252 87% 67% / 0.05)' }} />
        {items.map((b, i) => (
          <Bar key={b.key} dataKey={b.key} fill={i === 0 ? 'url(#bar-gradient)' : b.color} radius={[6, 6, 0, 0]} name={b.name} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBarChart({ data, height = 280, xKey = 'produto' }: BarProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
        <XAxis type="number" stroke={chartTheme.axis} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey={xKey} stroke={chartTheme.axis} fontSize={11} tickLine={false} axisLine={false} width={130} />
        <Tooltip contentStyle={chartTheme.tooltip} cursor={{ fill: 'hsl(252 87% 67% / 0.05)' }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
        <Bar dataKey="vistos" fill="hsl(252 87% 67%)" radius={[0, 6, 6, 0]} name="Vistos" />
        <Bar dataKey="citados" fill="hsl(199 89% 48%)" radius={[0, 6, 6, 0]} name="Citados" />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface ScatterProps { data: any[]; height?: number; xKey: string; yKey: string; xName?: string; yName?: string }

export function VectorScatterChart({ data, height = 280, xKey, yKey, xName, yName }: ScatterProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
        <XAxis type="number" dataKey={xKey} name={xName ?? xKey} stroke={chartTheme.axis} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis type="number" dataKey={yKey} name={yName ?? yKey} stroke={chartTheme.axis} fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={chartTheme.tooltip} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={data} fill="hsl(252 87% 67%)" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

interface RadialProps { value: number; label: string; color?: string; size?: number }

export function RadialScore({ value, label, color = 'hsl(252 87% 67%)', size = 180 }: RadialProps) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: label, value, fill: color }]} startAngle={90} endAngle={-270}>
          <RadialBar background={{ fill: 'hsl(240 6% 14%)' }} dataKey="value" cornerRadius={20} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold tracking-tight tabular-nums">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
