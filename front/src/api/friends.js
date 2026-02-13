import { api } from './client';

export function sendFriendRequest(email) {
  return api('/api/friends/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function respondToRequest(email, accept) {
  return api('/api/friends/respond', {
    method: 'POST',
    body: JSON.stringify({ email, accept }),
  });
}

export function getFriends() {
  return api('/api/friends');
}

export function getFriendRequests() {
  return api('/api/friends/requests');
}

export function removeFriend(email) {
  return api(`/api/friends/${encodeURIComponent(email)}`, { method: 'DELETE' });
}

export function getFriendWeight(email) {
  return api(`/api/friends/${encodeURIComponent(email)}/weight`);
}

export function toggleFriendFavorite(email, favorite) {
  return api(`/api/friends/${encodeURIComponent(email)}/favorite`, {
    method: 'PATCH',
    body: JSON.stringify({ favorite }),
  });
}
