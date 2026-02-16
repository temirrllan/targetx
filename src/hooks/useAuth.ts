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
        setError(null);
        
        console.log('Fetching user data...');
        const userData = await authApi.getCurrentUser();
        console.log('User data received:', userData);
        
        setUser(userData);
      } catch (err) {
        const error = err as Error;
        console.error('Failed to fetch user:', error);
        setError(error);
        
        // Fallback to Telegram user data if API fails
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
          const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
          console.log('Using Telegram fallback data:', tgUser);
          
          setUser({
            id: tgUser.id.toString(),
            firstName: tgUser.first_name,
            lastName: tgUser.last_name,
            username: tgUser.username,
            photoUrl: tgUser.photo_url,
            subscription: 'not_paid',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
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
      const userData = await authApi.getCurrentUser();
      setUser(userData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, error, refetch };
};