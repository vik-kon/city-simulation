import { NextRequest, NextResponse } from 'next/server';

const BASE = "https://uncontrollable-vita-unincarcerated.ngrok-free.dev";

const headers = {
  "accept": "application/json",
  "ngrok-skip-browser-warning": "true",
  "Content-Type": "application/json",
};

const GROUPS = ["low_income", "mid_income", "high_income", "elite"];
const FIELDS = ["hunger", "housing", "injured", "education", "savings", "happiness"];

async function pollUntilDone(): Promise<void> {
  while (true) {
    const res = await fetch(`${BASE}/api/v1/run`, { headers });
    const json = await res.json();
    if (!json.simulating) break;
    await new Promise(r => setTimeout(r, 2000));
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const prompt: unknown = body?.prompt;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  // Start simulation
  const startRes = await fetch(`${BASE}/api/v1/run`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt: prompt.trim(), num_workers: 5 }),
  });

  if (!startRes.ok) {
    return NextResponse.json({ error: 'Failed to start simulation' }, { status: 502 });
  }

  // Wait for simulation to finish
  await pollUntilDone();

  // Fetch all data in parallel
  const [deadRes, migratedRes, winnerRes, loserRes, ...groupResults] = await Promise.all([
    fetch(`${BASE}/api/v1/data/figures/dead`,     { headers }).then(r => r.json()),
    fetch(`${BASE}/api/v1/data/figures/migrated`, { headers }).then(r => r.json()),
    fetch(`${BASE}/api/v1/data/figures/winner`,   { headers }).then(r => r.json()),
    fetch(`${BASE}/api/v1/data/figures/loser`,    { headers }).then(r => r.json()),
    ...GROUPS.map(group =>
      fetch(`${BASE}/api/v1/data/bulk`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status: [group], fields: FIELDS }),
      }).then(r => r.json())
    ),
  ]);

  // Build populationData map
  const populationData: Record<string, Record<string, number[]>> = {};
  GROUPS.forEach((group, i) => {
    populationData[group] = groupResults[i].data;
  });

  // Calculate net changes from low_income savings/happiness as aggregate proxy
  const savingsSeries:   number[] = populationData['low_income'].savings   ?? [];
  const happinessSeries: number[] = populationData['low_income'].happiness ?? [];

  const netSavingsChange   = savingsSeries.length   ? savingsSeries[savingsSeries.length - 1]   - savingsSeries[0]   : 0;
  const netHappinessChange = happinessSeries.length ? happinessSeries[happinessSeries.length - 1] - happinessSeries[0] : 0;

  const data = {
    prompt: prompt.trim(),
    aggregateMetrics: {
      netSavingsChange:   parseFloat(netSavingsChange.toFixed(3)),
      netHappinessChange: parseFloat(netHappinessChange.toFixed(3)),
      deaths:    deadRes.data.dead,
      emigrants: migratedRes.data.migrated,
      winner:    winnerRes.data.winner,
      loser:     loserRes.data.winner,
    },
    agentTimeSeries: savingsSeries.map((value, i) => ({
      step:      i + 1,
      savings:   value,
      happiness: happinessSeries[i],
    })),
    populationData,
    assumptions: [],
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(data);
}