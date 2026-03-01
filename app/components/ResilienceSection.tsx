'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip, Legend, 
} from 'recharts';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useSimulation } from '@/app/context/SimulationContext';

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

const statKeys = ['savings', 'hunger', 'housing', 'injured', 'happiness'] as const;
type StatKey = typeof statKeys[number];
const statLabels: Record<StatKey, string> = {
  savings: 'Savings', hunger: 'Hunger', housing: 'Housing',
  injured: 'Injury', happiness: 'Happiness',
};

const getTraitDescriptor = (key: StatKey, value: number) => {
  return metricBoundaries[key].find(b => value <= b.max)!;
};


const metricBoundaries: Record<
  StatKey,
  { max: number; label: string; color: string }[]
> = {
  savings: [
    { max: 0.19, label: 'Fragile', color: 'text-red-500' },
    { max: 0.39, label: 'Barely Buffered', color: 'text-orange-400' },
    { max: 0.64, label: 'Stable', color: 'text-yellow-400' },
    { max: 0.84, label: 'Well-Cushioned', color: 'text-green-400' },
    { max: 1.0, label: 'Secure', color: 'text-green-600' },
  ],

  hunger: [
    { max: 0.24, label: 'Starving', color: 'text-red-500' },
    { max: 0.44, label: 'Hungry', color: 'text-orange-400' },
    { max: 0.64, label: 'Okay', color: 'text-yellow-400' },
    { max: 0.84, label: 'Sated', color: 'text-green-400' },
    { max: 1.0, label: 'Full', color: 'text-green-600' },
  ],

  housing: [
    { max: 0.29, label: 'Unstable', color: 'text-red-500' },
    { max: 0.49, label: 'Precarious', color: 'text-orange-400' },
    { max: 0.69, label: 'Adequate', color: 'text-yellow-400' },
    { max: 0.89, label: 'Comfortable', color: 'text-green-400' },
    { max: 1.0, label: 'Secure', color: 'text-green-600' },
  ],

  happiness: [
    { max: 0.34, label: 'Low Spirits', color: 'text-red-500' },
    { max: 0.54, label: 'Muted', color: 'text-orange-400' },
    { max: 0.74, label: 'Steady', color: 'text-yellow-400' },
    { max: 0.89, label: 'Upbeat', color: 'text-green-400' },
    { max: 1.0, label: 'Thriving', color: 'text-green-600' },
  ],

  injured: [
  { max: 0.20, label: 'Optimal',  color: 'text-green-600' },
  { max: 0.39, label: 'Stable',   color: 'text-green-400' },
  { max: 0.59, label: 'Impaired', color: 'text-yellow-400' },
  { max: 0.79, label: 'Severe',   color: 'text-orange-400' },
  { max: 1.0,  label: 'Critical', color: 'text-red-500' },
],
};


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

export function ResilienceSection() {
  const { simulationData } = useSimulation();
  const [agentId, setAgentId] = useState('agent_001');
  const [stat, setStat] = useState<StatKey>('savings');

  if (!simulationData) {
    return <div className="w-full h-screen flex items-center justify-center">No data</div>;
  }

  const { agentsData } = simulationData;
  const agentData = agentsData[agentId];
  const series = agentData?.[stat] ?? [];

  const chartData = series.map((value, i) => ({
    step: i + 1,
    value,
  }));

  
  const profile = statKeys.map(key => ({
    key,
    label: statLabels[key],
    value: agentsData[agentId]?.[key]?.[0] ?? 0,
  }));

  const agentOptions = Array.from({ length: 20 }, (_, i) => {
    const id = `agent_${String(i + 1).padStart(3, '0')}`;
    return { value: id, label: `Agent ${String(i + 1).padStart(3, '0')}` };
  });

  const animKey = `${agentId}-${stat}`;

  return (
    <div className="min-w-full h-full px-[60px] pt-[90px] pb-10 flex flex-col relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="text-[10px] tracking-[0.3em] text-primary uppercase mb-2">03 — Agent Simulation</div>
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="font-display italic text-[clamp(32px,4vw,52px)] font-normal leading-[1.1] mb-1.5 text-foreground">
              Agent-Based Behavior Analysis
            </h1>
            <div className="text-[11px] tracking-[0.15em] text-muted uppercase">
              20 agents · Personality-driven responses · Temporal dynamics
            </div>
          </div>
          <div className="flex gap-3">
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger className="w-[140px] h-8 text-[11px] bg-card border-primary/20 text-foreground font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-primary/20 max-h-[300px]">
                {agentOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value} className="text-[11px] font-mono text-foreground">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stat} onValueChange={(v) => setStat(v as StatKey)}>
              <SelectTrigger className="w-[140px] h-8 text-[11px] bg-card border-primary/20 text-foreground font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-primary/20">
                {statKeys.map((k) => (
                  <SelectItem key={k} value={k} className="text-[11px] font-mono text-foreground">
                    {statLabels[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

        
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <div className="bg-card border border-primary/[0.15] p-4 flex items-center gap-6">
            <div className="text-[9px] tracking-[0.2em] text-primary uppercase whitespace-nowrap">Initial Profile</div>
            <div className="flex gap-4 flex-wrap">
              {profile.map(({ key, label, value }) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted font-mono">{label}:</span>
                  <span className="text-[10px] text-foreground font-mono font-bold">{value.toFixed(2)}</span>
                  <span className={`text-[9px] font-mono ${
                    value >= 0.8 ? 'text-positive' : value >= 0.5 ? 'text-yellow-600' : 'text-negative'
                  }`}>
                    {(() => {
  const desc = getTraitDescriptor(key, value);
  return (
    <span className={`text-[9px] font-mono ${desc.color}`}>
      ({desc.label})
    </span>
  );
})()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Chart */}
        <div className="flex-1">
          <motion.div
            custom={0}
            variants={chartVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="h-full"
          >
            <ChartPanel
              title={`${statLabels[stat]} Over Time · ${agentId}`}
              sub="Time series for selected agent"
            >
              <ResponsiveContainer width="100%" height="100%" key={animKey}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="agentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartStyle.accent} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={chartStyle.accent} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.gridColor} vertical={false} />
                  <XAxis dataKey="step" tick={{ fill: chartStyle.muted, fontSize: 10, fontFamily: 'Courier Prime' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartStyle.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'Courier Prime' }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name={`${agentId} · ${statLabels[stat]}`}
                    stroke={chartStyle.accent}
                    strokeWidth={2}
                    fill="url(#agentGrad)"
                    dot={{ r: 2, fill: chartStyle.accent }}
                    animationDuration={ANIM_DURATION}
                    animationEasing={ANIM_EASING}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>
          </motion.div>
        </div>

        <div className="absolute bottom-8 right-16 text-[120px] font-display font-bold text-primary/[0.06] leading-none pointer-events-none select-none">
          03
        </div>
      </div>
    );
  }