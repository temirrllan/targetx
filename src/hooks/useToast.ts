import { useCallback } from 'react';
import { useHapticFeedback } from './useTelegramWebApp';

export const useToast = () => {
  const haptic = useHapticFeedback();

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.showAlert(message);
      
      if (type === 'success') {
        haptic.notificationOccurred('success');
      } else if (type === 'error') {
        haptic.notificationOccurred('error');
      }
    } else {
      // Fallback for development
      alert(message);
    }
  }, [haptic]);

  return { showToast };
};