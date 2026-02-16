import { useEffect, useState } from 'react';
import { authApi } from '../api/auth';
import type { User } from '../types/api';

const isDevelopment = import.meta.env.DEV;

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if Telegram WebApp is available
        if (!window.Telegram?.WebApp?.initData && !isDevelopment) {
          throw new Error('Приложение должно быть запущено через Telegram');
        }

        console.log('🔍 Fetching user data...');
        console.log('📱 Telegram WebApp available:', !!window.Telegram?.WebApp);
        console.log('🔑 Init data available:', !!window.Telegram?.WebApp?.initData);
        
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
          console.log('👤 Telegram user:', window.Telegram.WebApp.initDataUnsafe.user);
        }

        const userData = await authApi.getCurrentUser();
        console.log('✅ User data received:', userData);
        
        setUser(userData);
      } catch (err) {
        const error = err as Error;
        console.error('❌ Failed to fetch user:', error);
        setError(error);
        
        // Fallback to Telegram user data if API fails but we have Telegram data
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
          const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
          console.log('🔄 Using Telegram fallback data:', tgUser);
          
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
          setError(null); // Clear error since we have fallback data
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