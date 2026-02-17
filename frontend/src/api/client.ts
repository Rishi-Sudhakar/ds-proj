// API client - uses proxy in dev, so /api goes to backend
const API_BASE = '';

export async function fetchDataStats(): Promise<import('../types/api').DataStats> {
  const res = await fetch(`${API_BASE}/api/data/stats`);
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
  return res.json();
}

export async function fetchSampleData(limit: number): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${API_BASE}/api/data/sample?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch sample: ${res.status}`);
  return res.json();
}

export async function fetchModelPerformance(): Promise<import('../types/api').ModelPerformance> {
  const res = await fetch(`${API_BASE}/api/ml/model/performance`);
  if (!res.ok) throw new Error(`Failed to fetch performance: ${res.status}`);
  return res.json();
}

export async function predictProductivity(params: import('../types/api').ProductivityParams): Promise<{ predicted_productivity: number }> {
  const searchParams = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  );
  const res = await fetch(`${API_BASE}/api/ml/predict/productivity?${searchParams}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Prediction failed: ${res.status}`);
  return res.json();
}

export async function predictStress(params: import('../types/api').StressParams): Promise<{ predicted_stress_level: number }> {
  const searchParams = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  );
  const res = await fetch(`${API_BASE}/api/ml/predict/stress?${searchParams}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Prediction failed: ${res.status}`);
  return res.json();
}

export async function fetchVizData<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`Failed to fetch viz data: ${res.status}`);
  return res.json();
}
