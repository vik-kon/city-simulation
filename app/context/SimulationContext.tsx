'use client';

import React, { createContext, useContext, useState } from 'react';

export interface SimulationData {
  prompt: string;
  aggregateMetrics: {
    netSavingsChange: number;
    netHappinessChange: number;
    deaths: number;
    emigrants: number;
    winner: string;
    loser: string;
  };
  agentTimeSeries: Array<{
    step: number;
    savings: number;
    happiness: number;
  }>;
  assumptions: string[];
  timestamp: Date;
}

interface SimulationContextType {
  simulationData: SimulationData | null;
  isLoading: boolean;
  error: string | null;
  runSimulation: (prompt: string) => Promise<void>;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async (prompt: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Simulation failed');
      }

      const data = await res.json();
      console.log('simulation data:', data);

      setSimulationData({ ...data, timestamp: new Date(data.timestamp) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SimulationContext.Provider value={{ simulationData, isLoading, error, runSimulation }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) throw new Error('useSimulation must be used within SimulationProvider');
  return context;
}