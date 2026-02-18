import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { User } from '../types/api';

interface MeResponse {
  user: {
    _id: string;
    tgId: number;
    firstName?: string;
    lastName?: string;
    username?: string;
    photoUrl?: string;
    isPremium?: boolean;
    subscription?: 'not_paid' | 'plus' | 'prem';
    stats?: unknown;
  };
  channels?: unknown[];
}

const mapUser = (raw: MeResponse['user']): User => ({
  id: raw._id || String(raw.tgId),
  firstName: raw.firstName,
  lastName: raw.lastName,
  username: raw.username,
  photoUrl: raw.photoUrl,
  subscription: raw.subscription ?? 'not_paid',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await apiClient.request<MeResponse>('/api/tgapp/me', { method: 'GET' });
        const raw = res.user ?? (res as unknown as MeResponse['user']);
        setUser(mapUser(raw));

      } catch (err) {
        const error = err as Error;
        setError(error);

        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser) {
          setUser({
            id: String(tgUser.id),
            firstName: tgUser.first_name,
            lastName: tgUser.last_name,
            username: tgUser.username,
            photoUrl: tgUser.photo_url,
            subscription: 'not_paid',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setError(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.request<MeResponse>('/api/tgapp/me', { method: 'GET' });
      const raw = res.user ?? (res as unknown as MeResponse['user']);
      setUser(mapUser(raw));
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, error, refetch };
};