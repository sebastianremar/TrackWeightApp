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
    if (entries.length === 0) {
      return { current: null, avgWeeklyChange: null, weekOverWeek: null, lowest: null, highest: null, average: null };
    }
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const weights = sorted.map((e) => e.weight);
    const current = weights[weights.length - 1];
    const first = weights[0];
    const lowest = Math.min(...weights);
    const highest = Math.max(...weights);
    const average = +(weights.reduce((s, w) => s + w, 0) / weights.length).toFixed(1);

    // Avg weekly change
    const firstDate = new Date(sorted[0].date + 'T00:00:00');
    const lastDate = new Date(sorted[sorted.length - 1].date + 'T00:00:00');
    const weeks = Math.max(1, (lastDate - firstDate) / (7 * 24 * 60 * 60 * 1000));
    const avgWeeklyChange = +((current - first) / weeks).toFixed(2);

    // Week-over-week: this week avg - last week avg
    const today = new Date();
    const dow = today.getDay();
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - dow);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const fmtD = (d) => d.toISOString().split('T')[0];
    const thisWeekStr = fmtD(thisWeekStart);
    const lastWeekStr = fmtD(lastWeekStart);

    const thisWeekEntries = sorted.filter((e) => e.date >= thisWeekStr);
    const lastWeekEntries = sorted.filter((e) => e.date >= lastWeekStr && e.date < thisWeekStr);

    let weekOverWeek = null;
    if (thisWeekEntries.length > 0 && lastWeekEntries.length > 0) {
      const thisAvg = thisWeekEntries.reduce((s, e) => s + e.weight, 0) / thisWeekEntries.length;
      const lastAvg = lastWeekEntries.reduce((s, e) => s + e.weight, 0) / lastWeekEntries.length;
      weekOverWeek = +(thisAvg - lastAvg).toFixed(1);
    }

    return { current, avgWeeklyChange, weekOverWeek, lowest, highest, average };
  })();

  return { entries, loading, error, range, setRange, refetch: fetchData, stats };
}
