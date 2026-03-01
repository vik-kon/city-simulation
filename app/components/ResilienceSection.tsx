'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip, Legend, Line,
} from 'recharts';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useSimulation } from '@/app/context/SimulationContext';

const AGENT_COUNT = 20;

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

const statKeys = ['savings', 'hunger', 'housing', 'education', 'happiness'] as const;
type StatKey = typeof statKeys[number];
const statLabels: Record<StatKey, string> = {
  savings: 'Savings', hunger: 'Hunger', housing: 'Housing',
  education: 'Education', happiness: 'Happiness',
};

const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
};

const getAgentTraits = (agentIndex: number): Record<StatKey, number> => {
  const result = {} as Record<StatKey, number>;
  statKeys.forEach((key, i) => {
    const seed = agentIndex * 13 + i * 7 + 3;
    result[key] = 40 + Math.round(seededRandom(seed) * 55);
  });
  return result;
};

const traitDescriptor = (val: number) => {
  if (val >= 80) return 'High';
  if (val >= 55) return 'Moderate';
  return 'Low';
};

const generateAgentData = (
  agentIndex: number,
  baseSeries: { month: string; value: number; baseline: number }[],
) => {
  const seed = agentIndex * 6;
  const drop = 1.5 + seededRandom(seed) * 4.5;
  const recovery = 0.02 + seededRandom(seed + 100) * 0.1;
  const volatility = 0.3 + seededRandom(seed + 200) * 0.7;

  return baseSeries.map(({ month, baseline }, i) => ({
    month,
    value: +(100 - drop * (1 - Math.exp(-i / 3)) + (i > 6 ? (i - 6) * recovery : 0) + (seededRandom(seed + i * 7) - 0.5) * volatility).toFixed(1),
    baseline,
  }));
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
  const [agentId, setAgentId] = useState('1');
  const [stat, setStat] = useState<StatKey>('savings');

  if (!simulationData) {
    return <div className="w-full h-screen flex items-center justify-center">No data</div>;
  }

  const { agentTimeSeries } = simulationData;
  const agentIndex = parseInt(agentId);
  const traits = getAgentTraits(agentIndex);
  const agentData = generateAgentData(agentIndex, agentTimeSeries);
  const animKey = `${agentId}-${stat}`;

  const agentOptions = Array.from({ length: AGENT_COUNT }, (_, i) => ({
    value: String(i + 1),
    label: `Agent ${i + 1}`,
  }));

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
              {AGENT_COUNT} agents · Personality-driven responses · Temporal dynamics
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

      {/* Agent trait profile */}
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
            {statKeys.map((key) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted font-mono">{statLabels[key]}:</span>
                <span className="text-[10px] text-foreground font-mono font-bold">{traits[key]}</span>
                <span
                  className={`text-[9px] font-mono ${
                    traits[key] >= 80 ? 'text-positive' : traits[key] >= 55 ? 'text-yellow-600' : 'text-negative'
                  }`}
                >
                  ({traitDescriptor(traits[key])})
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
            title={`${statLabels[stat]} Over Time · Agent ${agentId}`}
            sub="Monthly index trajectory vs baseline"
          >
            <ResponsiveContainer width="100%" height="100%" key={animKey}>
              <AreaChart data={agentData}>
                <defs>
                  <linearGradient id="agentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartStyle.accent} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartStyle.accent} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.gridColor} vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: chartStyle.muted, fontSize: 10, fontFamily: 'Courier Prime' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[88, 'auto']}
                  tick={{ fill: chartStyle.muted, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'Courier Prime' }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name={`Agent ${agentId}`}
                  stroke={chartStyle.accent}
                  strokeWidth={2}
                  fill="url(#agentGrad)"
                  dot={{ r: 2, fill: chartStyle.accent }}
                  animationDuration={ANIM_DURATION}
                  animationEasing={ANIM_EASING}
                />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  name="Baseline"
                  stroke="rgba(112,104,94,0.5)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
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
