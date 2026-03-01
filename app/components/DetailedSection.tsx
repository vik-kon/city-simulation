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

// ── Types ────────────────────────────────────────────────────────────────────

type PopGroup = 'all' | 'low' | 'middle' | 'high';
type StatKey = 'hunger' | 'housing' | 'injury' | 'education' | 'savings' | 'happiness';

const statLabels: Record<StatKey, string> = {
  hunger: 'Hunger', housing: 'Housing', injury: 'Injury',
  education: 'Education', savings: 'Savings', happiness: 'Happiness',
};

const popLabels: Record<PopGroup, string> = {
  all: 'All Population', low: 'Low Income',
  middle: 'Middle Income ', high: 'High Income ',
};

// ── Hardcoded per-stat datasets (from original design) ───────────────────────

const incomeDataSets: Record<StatKey, Record<PopGroup, number[]>> = {
  hunger: {
    all: [-8.2, -6.1, -3.4, -1.8, -0.6],
    low: [-12.4, -8.9, -4.1, -1.2, -0.3],
    middle: [-5.8, -5.4, -4.2, -2.1, -0.7],
    high: [-2.1, -1.8, -1.4, -1.0, -0.5],
  },
  housing: {
    all: [-5.1, -4.2, -3.0, -1.9, -0.9],
    low: [-9.3, -7.1, -3.8, -1.4, -0.4],
    middle: [-4.2, -4.0, -3.6, -2.5, -1.1],
    high: [-1.8, -1.5, -1.2, -1.0, -0.8],
  },
  injury: {
    all: [-3.8, -3.1, -2.2, -1.4, -0.5],
    low: [-6.7, -5.2, -2.8, -0.9, -0.2],
    middle: [-3.1, -2.9, -2.6, -1.8, -0.6],
    high: [-1.2, -1.0, -0.8, -0.7, -0.4],
  },
  education: {
    all: [-6.4, -5.0, -3.6, -2.1, -0.8],
    low: [-11.1, -7.8, -4.5, -1.5, -0.3],
    middle: [-5.2, -4.8, -4.1, -2.8, -0.9],
    high: [-2.4, -2.0, -1.6, -1.2, -0.7],
  },
  savings: {
    all: [-9.1, -7.2, -4.8, -2.6, -1.1],
    low: [-14.6, -10.4, -5.9, -1.8, -0.4],
    middle: [-7.4, -6.8, -5.6, -3.4, -1.3],
    high: [-3.2, -2.8, -2.2, -1.8, -1.0],
  },
  happiness: {
    all: [-7.5, -5.8, -3.9, -2.3, -0.9],
    low: [-13.2, -9.1, -4.8, -1.6, -0.3],
    middle: [-6.1, -5.5, -4.5, -3.0, -1.1],
    high: [-2.8, -2.3, -1.8, -1.4, -0.8],
  },
};


const employmentDataSets: Record<StatKey, Record<PopGroup, { drop: number; recovery: number }>> = {
  hunger:    { all: { drop: 2.8, recovery: 0.06 }, low: { drop: 4.2, recovery: 0.04 }, middle: { drop: 2.4, recovery: 0.07 }, high: { drop: 1.1, recovery: 0.09 } },
  housing:   { all: { drop: 1.9, recovery: 0.08 }, low: { drop: 3.1, recovery: 0.05 }, middle: { drop: 1.7, recovery: 0.08 }, high: { drop: 0.8, recovery: 0.10 } },
  injury:    { all: { drop: 1.4, recovery: 0.05 }, low: { drop: 2.6, recovery: 0.03 }, middle: { drop: 1.2, recovery: 0.06 }, high: { drop: 0.5, recovery: 0.08 } },
  education: { all: { drop: 2.2, recovery: 0.07 }, low: { drop: 3.8, recovery: 0.04 }, middle: { drop: 2.0, recovery: 0.07 }, high: { drop: 0.9, recovery: 0.09 } },
  savings:   { all: { drop: 3.1, recovery: 0.08 }, low: { drop: 5.0, recovery: 0.05 }, middle: { drop: 2.8, recovery: 0.08 }, high: { drop: 1.4, recovery: 0.10 } },
  happiness: { all: { drop: 2.0, recovery: 0.04 }, low: { drop: 3.5, recovery: 0.02 }, middle: { drop: 1.8, recovery: 0.05 }, high: { drop: 0.7, recovery: 0.07 } },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function generateEmploymentData(pop: PopGroup, stat: StatKey) {
  const { drop, recovery } = employmentDataSets[stat][pop];
  return MONTHS.map((month, i) => ({
    month,
    tariff: +(100 - drop * (1 - Math.exp(-i / 3)) + (i > 6 ? (i - 6) * recovery : 0)).toFixed(1),
    baseline: +(100 + i * 0.15).toFixed(1),
  }));
}

// ── Chart config ─────────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export function DetailedSection() {
  const { simulationData } = useSimulation();
  const [popGroup, setPopGroup] = useState<PopGroup>('all');
  const [stat, setStat] = useState<StatKey>('savings');

  if (!simulationData) {
    return <div className="w-full h-screen flex items-center justify-center">No data</div>;
  }

  const animKey = `${popGroup}-${stat}`;

  const incomeCompareData = [
    { group: 'Low Income',    change: incomeDataSets[stat].low[0] },
    { group: 'Middle Income', change: incomeDataSets[stat].middle[2] },
    { group: 'High Income',   change: incomeDataSets[stat].high[4] },
  ];

  const timeSeriesData = generateEmploymentData(popGroup === 'all' ? 'all' : popGroup, stat);

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
            <ChartPanel key="compare" title={`${statLabels[stat]} Impact by Income Group`} sub="% change · Low / Middle / High">
              <ResponsiveContainer width="100%" height="100%" key={animKey + '-compare'}>
                <BarChart data={incomeCompareData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.gridColor} vertical={false} />
                  <XAxis dataKey="group" tick={{ fill: chartStyle.muted, fontSize: 10, fontFamily: 'Courier Prime' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartStyle.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="change" radius={[2, 2, 0, 0]} animationDuration={ANIM_DURATION} animationEasing={ANIM_EASING}>
                    <Cell fill="#c05050" />
                    <Cell fill="#a06030" />
                    <Cell fill="#64a050" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>,

            <ChartPanel key="timeline" title={`${statLabels[stat]} Over Time · All Population`} sub="Monthly index trajectory">
              <ResponsiveContainer width="100%" height="100%" key={animKey + '-timeline'}>
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="tariffGradAll" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartStyle.accent} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={chartStyle.accent} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.gridColor} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: chartStyle.muted, fontSize: 10, fontFamily: 'Courier Prime' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[94, 'auto']} tick={{ fill: chartStyle.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'Courier Prime' }} />
                  <Area type="monotone" dataKey="tariff" name="With Policy" stroke={chartStyle.accent} strokeWidth={2} fill="url(#tariffGradAll)" dot={{ r: 2, fill: chartStyle.accent }} animationDuration={ANIM_DURATION} animationEasing={ANIM_EASING} />
                  <Line type="monotone" dataKey="baseline" name="Baseline" stroke="rgba(112,104,94,0.5)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} animationDuration={ANIM_DURATION} animationEasing={ANIM_EASING} />
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
              sub="Monthly index trajectory vs baseline"
            >
              <ResponsiveContainer width="100%" height="100%" key={animKey + '-single'}>
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="tariffGradSingle" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartStyle.accent} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={chartStyle.accent} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.gridColor} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: chartStyle.muted, fontSize: 10, fontFamily: 'Courier Prime' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[94, 'auto']} tick={{ fill: chartStyle.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'Courier Prime' }} />
                  <Area type="monotone" dataKey="tariff" name="With Policy" stroke={chartStyle.accent} strokeWidth={2} fill="url(#tariffGradSingle)" dot={{ r: 2, fill: chartStyle.accent }} animationDuration={ANIM_DURATION} animationEasing={ANIM_EASING} />
                  <Line type="monotone" dataKey="baseline" name="Baseline" stroke="rgba(112,104,94,0.5)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} animationDuration={ANIM_DURATION} animationEasing={ANIM_EASING} />
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
