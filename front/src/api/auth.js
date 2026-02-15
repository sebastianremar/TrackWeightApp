import { api } from './client';

export function signin(email, password) {
  return api('/api/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function signup(firstName, lastName, email, password) {
  return api('/api/signup', {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName, email, password }),
  });
}

export function signout() {
  return api('/api/signout', { method: 'POST' });
}

export function getProfile() {
  return api('/api/me');
}

export function updateProfile(fields) {
  return api('/api/me', {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export function changePassword(currentPassword, newPassword) {
  return api('/api/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
