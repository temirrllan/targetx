import { useEffect, useState } from 'react';
import { fetchChannelDetails } from '../api/tgapp';
import type { ApiChannel, ApiPost } from '../types/api';

type UseChannelResult = {
  channel: ApiChannel | null;
  posts: ApiPost[];
  scheduledPostsCount: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useChannel(id: string | undefined): UseChannelResult {
  const [channel, setChannel] = useState<ApiChannel | null>(null);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [scheduledPostsCount, setScheduledPostsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchChannelDetails(id)
      .then((data) => {
        if (cancelled) return;
        setChannel(data.channel);
        setPosts(data.posts ?? []);
        setScheduledPostsCount(data.scheduledPostsCount ?? 0);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message ?? 'Ошибка загрузки канала');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, tick]);

  return {
    channel,
    posts,
    scheduledPostsCount,
    loading,
    error,
    reload: () => setTick((t) => t + 1),
  };
}