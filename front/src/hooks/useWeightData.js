import { useState, useEffect, useCallback } from 'react';
import { getWeightHistory } from '../api/weight';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export function useWeightData() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (range !== 'all') {
        params.from = daysAgo(range);
      }
      const data = await getWeightHistory(params);
      setEntries(data.entries || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = (() => {
    if (entries.length === 0) return { current: null, change: null, lowest: null };
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const current = sorted[sorted.length - 1].weight;
    const first = sorted[0].weight;
    const change = +(current - first).toFixed(1);
    const lowest = Math.min(...sorted.map((e) => e.weight));
    return { current, change, lowest };
  })();

  return { entries, loading, error, range, setRange, refetch: fetchData, stats };
}
