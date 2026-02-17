import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from '../api/auth';

export function useCategories() {
  const { user, updateUser } = useAuth();
  const categories = user?.todoCategories || [];

  const addCategory = useCallback(async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = [...categories, trimmed];
    const data = await updateProfile({ todoCategories: updated });
    updateUser({ todoCategories: data.todoCategories });
  }, [categories, updateUser]);

  const removeCategory = useCallback(async (name) => {
    const updated = categories.filter((c) => c !== name);
    const data = await updateProfile({ todoCategories: updated });
    updateUser({ todoCategories: data.todoCategories });
  }, [categories, updateUser]);

  return { categories, addCategory, removeCategory };
}
