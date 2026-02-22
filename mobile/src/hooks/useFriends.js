import { useState, useEffect, useCallback } from 'react';
import {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  respondToRequest,
  removeFriend as apiRemoveFriend,
  toggleFriendFavorite,
} from '../api/friends';
import { getCachedFriends, cacheFriends, getCachedFriendRequests, cacheFriendRequests } from '../offline/cache';
import { isOfflineError } from '../offline/syncEngine';

export function useFriends() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    // 1. Load from cache first
    try {
      const [cachedFriends, cachedRequests] = await Promise.all([
        getCachedFriends(),
        getCachedFriendRequests(),
      ]);
      if (cachedFriends.length > 0 || cachedRequests.length > 0) {
        setFriends(cachedFriends);
        setRequests(cachedRequests);
        setLoading(false);
      }
    } catch {}

    // 2. Fetch from API
    setError(null);
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(),
        getFriendRequests(),
      ]);
      const fetchedFriends = friendsData.friends || [];
      const fetchedRequests = requestsData.requests || [];
      setFriends(fetchedFriends);
      setRequests(fetchedRequests);
      cacheFriends(fetchedFriends).catch(() => {});
      cacheFriendRequests(fetchedRequests).catch(() => {});
    } catch (err) {
      if (!isOfflineError(err)) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addFriend = useCallback(async (email) => {
    await sendFriendRequest(email);
    await fetchAll();
  }, [fetchAll]);

  const respond = useCallback(async (email, accept) => {
    await respondToRequest(email, accept);
    await fetchAll();
  }, [fetchAll]);

  const removeFriend = useCallback(async (email) => {
    await apiRemoveFriend(email);
    setFriends((prev) => prev.filter((f) => f.email !== email));
  }, []);

  const toggleFavorite = useCallback(async (email, favorite) => {
    setFriends((prev) => prev.map((f) => f.email === email ? { ...f, favorite } : f));
    try {
      await toggleFriendFavorite(email, favorite);
    } catch {
      setFriends((prev) => prev.map((f) => f.email === email ? { ...f, favorite: !favorite } : f));
    }
  }, []);

  return { friends, requests, loading, error, addFriend, respond, removeFriend, toggleFavorite, refetch: fetchAll };
}
