import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { processQueue } from '../offline/syncEngine';

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
