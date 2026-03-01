  'use client';

  import { motion } from 'framer-motion';
  import { useSimulation } from '@/app/context/SimulationContext';

  export function OverviewSection() {
    const { simulationData } = useSimulation();
    if (!simulationData) {
      return <div className="w-full h-screen flex items-center justify-center">No data</div>;
    }

    const { aggregateMetrics, prompt, assumptions = [] } = simulationData;

    const kpis = [
    {
      label: 'Net Change in Savings',
      value: `${aggregateMetrics.netSavingsChange >= 0 ? '+' : ''}${aggregateMetrics.netSavingsChange.toFixed(2)}`,
      type:
  aggregateMetrics.netSavingsChange > 0
    ? ('pos' as const)
    : aggregateMetrics.netSavingsChange < 0
    ? ('neg' as const)
    : ('neutral' as const),
      delta: 'average across all agents',
    },
    {
      label: 'Net Change in Happiness',
      value: `${aggregateMetrics.netHappinessChange >= 0 ? '+' : ''}${aggregateMetrics.netHappinessChange.toFixed(2)}`,
      type:
  aggregateMetrics.netHappinessChange > 0
    ? ('pos' as const)
    : aggregateMetrics.netHappinessChange < 0
    ? ('neg' as const)
    : ('neutral' as const),
      delta: 'average across all agents',
    },
    {
      label: 'Number of Deaths',
      value: `${aggregateMetrics.deaths}`,
      type:
  aggregateMetrics.deaths === 0
    ? ('neutral' as const)
    : ('neg' as const),
      delta: 'total out of 15 agents',
    },
    {
      label: 'Number of Emigrants',
      value: `${aggregateMetrics.emigrants}`,
      type:
  aggregateMetrics.emigrants === 0
    ? ('neutral' as const)
    : ('neg' as const),
      delta: 'total out of 15 agents',
    },
  ];


    return (
      <div className="min-w-full h-full px-[60px] pt-[90px] pb-10 flex flex-col relative">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="text-[10px] tracking-[0.3em] text-primary uppercase mb-2">01 — Overview</div>
          <h1 className="font-display italic text-[clamp(32px,4vw,52px)] font-normal leading-[1.1] mb-1.5 text-foreground">
            Policy Impact at a Glance
          </h1>
          <div className="text-[11px] tracking-[0.15em] text-muted uppercase mb-10">
            Aggregate effects across metropolitan area · 4-week projection
          </div>
        </motion.div>

        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-4 gap-[2px] mb-8"
        >
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + 0.1 * i }}
              className="bg-card border border-primary/[0.15] p-5 relative group overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
              <div className="text-[9px] tracking-[0.25em] text-muted uppercase mb-3">{kpi.label}</div>
              <div
                className={`font-display text-4xl font-bold leading-none mb-1.5 ${
                kpi.type === 'pos'
                ? 'text-positive'
                : kpi.type === 'neg'
                ? 'text-negative'
                : 'text-foreground'
        }`}
              >
                {kpi.value}
              </div>
              <div className="text-[11px] text-muted">{kpi.delta}</div>
            </motion.div>
          ))}
        </motion.div>

        
        <div className="grid grid-cols-2 gap-5 flex-1">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-card border border-primary/[0.15] p-6 flex flex-col gap-5"
          >
            <div>
              <div className="text-[9px] tracking-[0.25em] text-primary uppercase mb-4 pb-3 border-b border-primary/20">
                Prompt Simulated
              </div>
              <p className="text-[15px] leading-[1.7] text-muted-foreground italic">
                &ldquo;{prompt}&rdquo;
              </p>
            </div>
            <div className="border border-primary/[0.15] px-4 py-3.5">
              <div className="text-[9px] tracking-[0.25em] text-primary uppercase mb-3">Assumptions</div>
              <ul className="flex flex-col gap-1.5">
                {assumptions.map((a, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground flex gap-2">
                    <span className="text-primary/40 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-col gap-4"
          >
            <div className="bg-card border border-primary/[0.15] p-6">
              <div className="text-[9px] tracking-[0.25em] text-positive/80 uppercase mb-4 pb-3 border-b border-primary/20">
                ↑ Who Benefits
              </div>
              <p className="text-xs text-muted-foreground">{aggregateMetrics.winner}</p>
            </div>
            <div className="bg-card border border-primary/[0.15] p-6">
              <div className="text-[9px] tracking-[0.25em] text-negative/80 uppercase mb-4 pb-3 border-b border-primary/20">
                ↓ Who Bears Cost
              </div>
              <p className="text-xs text-muted-foreground">{aggregateMetrics.loser}</p>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-8 right-16 text-[120px] font-display font-bold text-primary/[0.06] leading-none pointer-events-none select-none">
          01
        </div>
      </div>
    );
  }