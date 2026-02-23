import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { processQueue } from '../offline/syncEngine';
import { getDB, cleanupOldData } from '../offline/db';

const NetworkContext = createContext(null);

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const wasOnline = useRef(true);

  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await processQueue((count) => setPendingCount(count));
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);

      if (online && !wasOnline.current) {
        triggerSync();
      }
      wasOnline.current = online;
    });

    return unsubscribe;
  }, [triggerSync]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && wasOnline.current) {
        triggerSync();
      }
    });
    return () => sub.remove();
  }, [triggerSync]);

  // Run DB cleanup every 30 days
  useEffect(() => {
    (async () => {
      try {
        const db = await getDB();
        const row = await db.getFirstAsync(
          "SELECT value FROM sync_meta WHERE key = 'last_cleanup'",
        );
        const lastCleanup = row?.value ? new Date(row.value) : null;
        const daysSince = lastCleanup
          ? (Date.now() - lastCleanup.getTime()) / (1000 * 60 * 60 * 24)
          : Infinity;

        if (daysSince >= 30) {
          await cleanupOldData(90);
          await db.runAsync(
            "INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_cleanup', ?)",
            [new Date().toISOString()],
          );
        }
      } catch {
        // cleanup is best-effort
      }
    })();
  }, []);

  const refreshPendingCount = useCallback(async () => {
    const { getPendingCount } = require('../offline/mutationQueue');
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  return (
    <NetworkContext.Provider
      value={{ isOnline, pendingCount, isSyncing, triggerSync, refreshPendingCount }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within NetworkProvider');
  return ctx;
}
