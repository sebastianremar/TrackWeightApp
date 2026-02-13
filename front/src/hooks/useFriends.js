import { useState, useEffect, useCallback } from 'react';
import {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  respondToRequest,
  removeFriend as apiRemoveFriend,
  toggleFriendFavorite,
} from '../api/friends';

export function useFriends() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(),
        getFriendRequests(),
      ]);
      setFriends(friendsData.friends || []);
      setRequests(requestsData.requests || []);
    } catch (err) {
      setError(err.message);
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
    // Optimistic update
    setFriends((prev) => prev.map((f) => f.email === email ? { ...f, favorite } : f));
    try {
      await toggleFriendFavorite(email, favorite);
    } catch {
      // Rollback
      setFriends((prev) => prev.map((f) => f.email === email ? { ...f, favorite: !favorite } : f));
    }
  }, []);

  return { friends, requests, loading, error, addFriend, respond, removeFriend, toggleFavorite, refetch: fetchAll };
}
