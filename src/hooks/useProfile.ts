import { useEffect, useState } from 'react';
import { fetchMe } from '../api/tgapp';
import type { ApiUser, ApiChannel } from '../types/api';

type UseProfileResult = {
  user: ApiUser | null;
  channels: ApiChannel[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useProfile(): UseProfileResult {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [channels, setChannels] = useState<ApiChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchMe()
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        setChannels(data.channels);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message ?? 'Ошибка загрузки профиля');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    user,
    channels,
    loading,
    error,
    reload: () => setTick((t) => t + 1),
  };
}