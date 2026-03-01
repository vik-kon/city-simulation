'use client';

import React, { createContext, useContext, useState } from 'react';

export interface SimulationData {
  prompt: string;
  aggregateMetrics: {
    consumerPriceIndex: number;
    householdRealIncome: number;
    employmentImpact: number;
    municipalRevenue: number;
  };
  populationImpact: Record<string, number[]>;
  sectoralData: Array<{ name: string; impact: number }>;
  agentTimeSeries: Array<{ month: string; value: number; baseline: number }>;
  winners: string[];
  losers: string[];
  assumptions: string[];
  timestamp: Date;
}

interface SimulationContextType {
  simulationData: SimulationData | null;
  setSimulationData: (data: SimulationData) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <SimulationContext.Provider value={{ simulationData, setSimulationData, isLoading, setIsLoading }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within SimulationProvider');
  }
  return context;
}
