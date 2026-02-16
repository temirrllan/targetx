import { useEffect, useState } from 'react';
import { authApi } from '../api/auth';
import type { User } from '../types/api';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const userData = await authApi.getCurrentUser();
        setUser(userData);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to fetch user:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading, error, refetch: () => setUser(null) };
};