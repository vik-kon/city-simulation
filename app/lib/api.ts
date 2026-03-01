import type { SimulationData } from '@/app/context/SimulationContext';

/**
 * Calls the /api/simulate endpoint and returns typed SimulationData.
 * Throws an Error with a human-readable message on any failure.
 */
export async function runSimulation(prompt: string): Promise<SimulationData> {
  const res = await fetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Simulation failed (${res.status})`);
  }

  const data = await res.json() as Omit<SimulationData, 'timestamp'> & { timestamp: string };

  // JSON serialises Date as a string — normalise it back
  return { ...data, timestamp: new Date(data.timestamp) };
}
