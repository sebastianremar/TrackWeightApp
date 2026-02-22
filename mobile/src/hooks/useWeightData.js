import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getWeightHistory, logWeight, deleteWeight } from '../api/weight';
import {
  getCachedWeightEntries,
  cacheWeightEntries,
  cacheWeightEntry,
  cacheDeleteWeight,
} from '../offline/cache';
import { enqueue } from '../offline/mutationQueue';
import { isOfflineError } from '../offline/syncEngine';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export function useWeightData() {
  const [entries, setEntries] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [range, setRange] = useState(30);
  const hasLoaded = useRef(false);

  const fetchData = useCallback(async () => {
    const from = range !== 'all' ? daysAgo(range) : undefined;

    // 1. Load from cache first (instant render)
    try {
      const cached = await getCachedWeightEntries(from);
      if (cached.length > 0) {
        setEntries(cached);
        setInitialLoading(false);
      }
    } catch {}

    // 2. Fetch from API in background
    if (hasLoaded.current) setRefreshing(true);
    setError(null);
    try {
      const params = {};
      if (from) params.from = from;
      const data = await getWeightHistory(params);
      const fetched = data.entries || [];
      setEntries(fetched);
      hasLoaded.current = true;
      cacheWeightEntries(fetched).catch(() => {});
    } catch (err) {
      if (!isOfflineError(err)) setError(err.message);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => {
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

    const firstDate = new Date(sorted[0].date + 'T00:00:00');
    const lastDate = new Date(sorted[sorted.length - 1].date + 'T00:00:00');
    const weeks = Math.max(1, (lastDate - firstDate) / (7 * 24 * 60 * 60 * 1000));
    const avgWeeklyChange = +((current - first) / weeks).toFixed(2);

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
  }, [entries]);

  return { entries, initialLoading, refreshing, error, range, setRange, refetch: fetchData, stats };
}
