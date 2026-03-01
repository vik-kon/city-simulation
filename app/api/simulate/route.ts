import { NextRequest, NextResponse } from 'next/server';

const BASE = "https://uncontrollable-vita-unincarcerated.ngrok-free.dev";

const headers = {
  "accept": "application/json",
  "ngrok-skip-browser-warning": "true",
  "Content-Type": "application/json",
};

const GROUPS = ["low_income", "mid_income", "high_income", "elite"] as const;
const FIELDS = ["hunger", "housing", "injured", "education", "savings", "happiness"];

const safeFetch = async (url: string, options?: RequestInit) => {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      console.error(`[simulate] Failed ${url}:`, res.status, text);
      return { data: null };
    }
    return res.json();
  } catch (e) {
    console.error(`[simulate] Exception ${url}:`, e);
    return { data: null };
  }
};

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

  const startRes = await fetch(`${BASE}/api/v1/run`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt: prompt.trim(), num_workers: 15 }),
  });

  if (!startRes.ok) {
    return NextResponse.json({ error: 'Failed to start simulation' }, { status: 502 });
  }

  await pollUntilDone();

  const agentsListRes = await safeFetch(`${BASE}/api/v1/agents`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  const agentIds: string[] = agentsListRes?.data ? Object.keys(agentsListRes.data) : [];

  const [deadRes, migratedRes, winnerRes, loserRes, assumptionsRes, ...rest] = await Promise.all([
    safeFetch(`${BASE}/api/v1/data/figures/dead`,     { headers }),
    safeFetch(`${BASE}/api/v1/data/figures/migrated`, { headers }),
    safeFetch(`${BASE}/api/v1/data/figures/winner`,   { headers }),
    safeFetch(`${BASE}/api/v1/data/figures/loser`,    { headers }),
    safeFetch(`${BASE}/api/v1/data/assumptions`,      { headers }),
    ...GROUPS.map(group =>
      safeFetch(`${BASE}/api/v1/data/bulk`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status: [group], fields: FIELDS }),
      })
    ),
    ...agentIds.map(id =>
      safeFetch(`${BASE}/api/v1/data/agents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id,
          fields: ['savings', 'hunger', 'housing', 'injured', 'education', 'happiness'],
        }),
      })
    ),
  ]);

  const groupResults = rest.slice(0, GROUPS.length);
  const agentResults = rest.slice(GROUPS.length);

  const populationData: Record<string, Record<string, number[]>> = {};
  GROUPS.forEach((group, i) => {
    populationData[group] = groupResults[i]?.data ?? {};
  });

  const agentsData: Record<string, Record<string, number[]>> = {};
  agentIds.forEach((id, i) => {
    agentsData[id] = agentResults[i]?.data ?? {};
  });

  const savingsSeries:   number[] = populationData['low_income']?.savings   ?? [];
  const happinessSeries: number[] = populationData['low_income']?.happiness ?? [];

  const netSavingsChange   = savingsSeries.length   ? savingsSeries[savingsSeries.length - 1]   - savingsSeries[0]   : 0;
  const netHappinessChange = happinessSeries.length ? happinessSeries[happinessSeries.length - 1] - happinessSeries[0] : 0;

  const data = {
    prompt: prompt.trim(),
    aggregateMetrics: {
      netSavingsChange:   parseFloat(netSavingsChange.toFixed(3)),
      netHappinessChange: parseFloat(netHappinessChange.toFixed(3)),
      deaths:    deadRes?.data?.dead       ?? 0,
      emigrants: migratedRes?.data?.migrated ?? 0,
      winner:    winnerRes?.data?.winner   ?? '',
      loser:     loserRes?.data?.winner    ?? '',
    },
    agentTimeSeries: savingsSeries.map((value, i) => ({
      step:      i + 1,
      savings:   value,
      happiness: happinessSeries[i] ?? 0,
    })),
    populationData,
    agentsData,
    assumptions: (assumptionsRes?.data?.assumptions ?? []).slice(0, 8),
    timestamp: new Date().toISOString(),
  };

  console.log('[simulate] done — agents:', agentIds.length, '| assumptions:', data.assumptions.length);

  return NextResponse.json(data);
}