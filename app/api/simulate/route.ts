import { NextRequest, NextResponse } from 'next/server';
import type { SimulationData } from '@/app/context/SimulationContext';

interface ModalResponse {
  aggregate_metrics: {
    consumer_price_index: number;
    household_real_income: number;
    employment_impact: number;
    municipal_revenue: number;
  };
  population_impact: Record<string, number[]>;
  sectoral_data: Array<{ name: string; impact: number }>;
  agent_time_series: Array<{ month: string; value: number; baseline: number }>;
  winners: string[];
  losers: string[];
  assumptions: string[];
}

function mapModalResponse(prompt: string, r: ModalResponse): SimulationData {
  return {
    prompt,
    aggregateMetrics: {
      consumerPriceIndex:  r.aggregate_metrics.consumer_price_index,
      householdRealIncome: r.aggregate_metrics.household_real_income,
      employmentImpact:    r.aggregate_metrics.employment_impact,
      municipalRevenue:    r.aggregate_metrics.municipal_revenue,
    },
    populationImpact: r.population_impact,
    sectoralData:     r.sectoral_data,
    agentTimeSeries:  r.agent_time_series,
    winners:          r.winners,
    losers:           r.losers,
    assumptions:      r.assumptions ?? [],
    timestamp:        new Date(),
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const prompt: unknown = body?.prompt;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const modalUrl   = process.env.MODAL_SIMULATE_URL;
  const modalToken = process.env.MODAL_TOKEN;

  if (!modalUrl) {
    console.warn('[simulate] MODAL_SIMULATE_URL not set — returning mock data');
    return NextResponse.json(getMockData(prompt.trim()));
  }

  const modalRes = await fetch(modalUrl, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      ...(modalToken ? { Authorization: `Bearer ${modalToken}` } : {}),
    },
    body: JSON.stringify({ prompt: prompt.trim() }),
  });

  if (!modalRes.ok) {
    const text = await modalRes.text().catch(() => '');
    console.error('[simulate] Modal error:', modalRes.status, text);
    return NextResponse.json(
      { error: `Simulation backend error (${modalRes.status})` },
      { status: 502 },
    );
  }

  const raw = await modalRes.json() as ModalResponse;
  const data = mapModalResponse(prompt.trim(), raw);

  return NextResponse.json({ ...data, timestamp: data.timestamp.toISOString() });
}

function getMockData(prompt: string): Omit<SimulationData, 'timestamp'> & { timestamp: string } {
  return {
    prompt,
    aggregateMetrics: {
      consumerPriceIndex: 3.2, householdRealIncome: -840,
      employmentImpact: -1.4,  municipalRevenue: 290,
    },
    populationImpact: {
      'Low Income':    [-8.2, -6.1, -3.4, -1.8, -0.6],
      'Middle Income': [-5.8, -5.4, -4.2, -2.1, -0.7],
      'High Income':   [-2.1, -1.8, -1.4, -1.0, -0.5],
    },
    sectoralData: [
      { name: 'Retail & Trade', impact: 18.2 }, { name: 'Manufacturing', impact: 12.5 },
      { name: 'Services',       impact: 8.7  }, { name: 'Transportation', impact: 6.3  },
      { name: 'Finance',        impact: 4.1  }, { name: 'Other',          impact: 2.8  },
    ],
    agentTimeSeries: [
      { month: 'Jan', value: 100,  baseline: 100   }, { month: 'Feb', value: 95.2, baseline: 100.2 },
      { month: 'Mar', value: 88.7, baseline: 100.5 }, { month: 'Apr', value: 83.1, baseline: 100.7 },
      { month: 'May', value: 79.8, baseline: 101.0 }, { month: 'Jun', value: 78.2, baseline: 101.2 },
      { month: 'Jul', value: 79.5, baseline: 101.5 }, { month: 'Aug', value: 82.1, baseline: 101.7 },
      { month: 'Sep', value: 85.3, baseline: 102.0 }, { month: 'Oct', value: 88.7, baseline: 102.2 },
      { month: 'Nov', value: 91.2, baseline: 102.5 }, { month: 'Dec', value: 93.8, baseline: 102.7 },
    ],
    winners: [
      'Municipal government via tariff revenues',
      'Local manufacturers with minimal import exposure',
      'Government employees and pensioners',
    ],
    losers: [
      'Low-income households (8.4% impact on spending)',
      'Import-dependent retailers',
      'Small businesses facing higher input costs',
    ],
    assumptions: [
      'Tariff applies uniformly across all imported goods',
      'Consumer demand elasticity estimated at −0.6',
      'No retaliatory measures from trading partners',
      'Municipal enforcement capacity remains constant',
      'Supply chains cannot be rerouted within the 12-month window',
    ],
    timestamp: new Date().toISOString(),
  };
}
