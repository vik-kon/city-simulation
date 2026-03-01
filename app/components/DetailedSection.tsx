'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  AreaChart, Area, Line, Tooltip, Legend, Cell,
} from 'recharts';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useSimulation } from '@/app/context/SimulationContext';

type PopGroup = 'all' | 'low_income' | 'mid_income' | 'high_income' | 'elite';
type StatKey = 'hunger' | 'housing' | 'injured' | 'education' | 'savings' | 'happiness';

const statLabels: Record<StatKey, string> = {
  hunger: 'Hunger', housing: 'Housing', injured: 'Injury',
  education: 'Education', savings: 'Savings', happiness: 'Happiness',
};

const popLabels: Record<PopGroup, string> = {
  all: 'All Population', low_income: 'Low Income',
  mid_income: 'Middle Income', high_income: 'High Income', elite: 'Elite',
};

const chartStyle = {
  gridColor: 'rgba(160,96,48,0.08)',
  accent: '#a06030',
  muted: '#70685e',
};

const tooltipStyle = {
  background: '#2c2018',
  border: '1px solid rgba(160,96,48,0.3)',
  color: '#ece8e0',
  fontFamily: 'Courier Prime',
  fontSize: 11,
};

const ANIM_DURATION = 800;
const ANIM_EASING = 'ease-out' as const;

const ChartPanel = ({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) => (
  <div className="bg-card border border-primary/[0.15] p-5 flex flex-col h-full">
    <div className="text-[9px] tracking-[0.2em] text-primary uppercase mb-1">{title}</div>
    <div className="text-[10px] text-muted mb-3.5">{sub}</div>
    <div className="flex-1 min-h-0">{children}</div>
  </div>
);

const chartVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, delay: 0.2 + 0.15 * i },
  }),
};

export function DetailedSection() {
  const { simulationData } = useSimulation();
  const [popGroup, setPopGroup] = useState<PopGroup>('all');
  const [stat, setStat] = useState<StatKey>('savings');

  if (!simulationData) {
    return <div className="w-full h-screen flex items-center justify-center">No data</div>;
  }

  const { populationData } = simulationData;
  const animKey = `${popGroup}-${stat}`;
  const GROUPS = ['low_income', 'mid_income', 'high_income', 'elite'] as const;

  // Build time series for selected group or averaged across all
  function getTimeSeries(group: PopGroup) {
    const groups = group === 'all' ? GROUPS : [group];
    const series = groups.map(g => populationData[g]?.[stat] ?? []);
    const len = Math.max(...series.map(s => s.length));
    return Array.from({ length: len }, (_, i) => ({
      step: i + 1,
      value: series.reduce((sum, s) => sum + (s[i] ?? 0), 0) / series.length,
    }));
  }

  // Bar chart data — last value minus first value per group
  const incomeCompareData = GROUPS.map(g => {
    const series = populationData[g]?.[stat] ?? [];
    const change = series.length ? series[series.length - 1] - series[0] : 0;
    return { group: popLabels[g], change: parseFloat(change.toFixed(3)) };
  });

  const timeSeriesData = getTimeSeries(popGroup);

  const barColors = ['#c05050', '#a06030', '#64a050', '#5080a0'];

  return (
    <div className="min-w-full h-full px-[60px] pt-[90px] pb-10 flex flex-col relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="text-[10px] tracking-[0.3em] text-primary uppercase mb-2">02 — Detailed Analysis</div>
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="font-display italic text-[clamp(32px,4vw,52px)] font-normal leading-[1.1] mb-1.5 text-foreground">
              Stratified Impact by Segment
            </h1>
            <div className="text-[11px] tracking-[0.15em] text-muted uppercase">
              Income cohorts · Sector breakdown · Temporal dynamics
            </div>
          </div>
          <div className="flex gap-3">
            <Select value={popGroup} onValueChange={(v) => setPopGroup(v as PopGroup)}>
              <SelectTrigger className="w-[180px] h-8 text-[11px] bg-card border-primary/20 text-foreground font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-primary/20">
                {(Object.entries(popLabels) as [PopGroup, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-[11px] font-mono text-foreground">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stat} onValueChange={(v) => setStat(v as StatKey)}>
              <SelectTrigger className="w-[150px] h-8 text-[11px] bg-card border-primary/20 text-foreground font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-primary/20">
                {(Object.entries(statLabels) as [StatKey, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-[11px] font-mono text-foreground">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {popGroup === 'all' ? (
        <div className="grid grid-cols-2 gap-4 flex-1">
          {[
            <ChartPanel key="compare" title={`${statLabels[stat]} Impact by Income Group`} sub="Net change from start to end of simulation">
              <ResponsiveContainer width="100%" height="100%" key={animKey + '-compare'}>
                <BarChart data={incomeCompareData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.gridColor} vertical={false} />
                  <XAxis dataKey="group" tick={{ fill: chartStyle.muted, fontSize: 10, fontFamily: 'Courier Prime' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartStyle.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="change" radius={[2, 2, 0, 0]} animationDuration={ANIM_DURATION} animationEasing={ANIM_EASING}>
                    {incomeCompareData.map((_, i) => (
                      <Cell key={i} fill={barColors[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>,

            <ChartPanel key="timeline" title={`${statLabels[stat]} Over Time · All Population`} sub="Averaged across all income groups">
              <ResponsiveContainer width="100%" height="100%" key={animKey + '-timeline'}>
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartStyle.accent} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={chartStyle.accent} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.gridColor} vertical={false} />
                  <XAxis dataKey="step" tick={{ fill: chartStyle.muted, fontSize: 10, fontFamily: 'Courier Prime' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartStyle.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="value" name={statLabels[stat]} stroke={chartStyle.accent} strokeWidth={2} fill="url(#areaGrad)" dot={{ r: 2, fill: chartStyle.accent }} animationDuration={ANIM_DURATION} animationEasing={ANIM_EASING} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>,
          ].map((chart, i) => (
            <motion.div key={i} custom={i} variants={chartVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              {chart}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex-1">
          <motion.div custom={0} variants={chartVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="h-full">
            <ChartPanel
              title={`${statLabels[stat]} Over Time · ${popLabels[popGroup]}`}
              sub="Time series for selected income group"
            >
              <ResponsiveContainer width="100%" height="100%" key={animKey + '-single'}>
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="areaGradSingle" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartStyle.accent} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={chartStyle.accent} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.gridColor} vertical={false} />
                  <XAxis dataKey="step" tick={{ fill: chartStyle.muted, fontSize: 10, fontFamily: 'Courier Prime' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartStyle.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="value" name={statLabels[stat]} stroke={chartStyle.accent} strokeWidth={2} fill="url(#areaGradSingle)" dot={{ r: 2, fill: chartStyle.accent }} animationDuration={ANIM_DURATION} animationEasing={ANIM_EASING} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>
          </motion.div>
        </div>
      )}

      <div className="absolute bottom-8 right-16 text-[120px] font-display font-bold text-primary/[0.06] leading-none pointer-events-none select-none">
        02
      </div>
    </div>
  );
}