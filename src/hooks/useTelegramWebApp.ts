import { useEffect, useState } from 'react';
import type { TelegramWebApp } from '../types/telegram';

export const useTelegramWebApp = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      setWebApp(tg);
      
      tg.ready();
      tg.expand();
      
      // Set theme colors
      tg.headerColor = '#020617'; // slate-950
      tg.backgroundColor = '#020617';
      
      setIsReady(true);
    }
  }, []);

  return { webApp, isReady };
};

export const useBackButton = (onClick: () => void, show = true) => {
  const { webApp } = useTelegramWebApp();

  useEffect(() => {
    if (!webApp) return;

    const backButton = webApp.BackButton;
    
    if (show) {
      backButton.show();
      backButton.onClick(onClick);
    } else {
      backButton.hide();
    }

    return () => {
      backButton.offClick(onClick);
      backButton.hide();
    };
  }, [webApp, onClick, show]);
};

export const useMainButton = (
  text: string,
  onClick: () => void,
  options?: {
    show?: boolean;
    color?: string;
    textColor?: string;
    isActive?: boolean;
  }
) => {
  const { webApp } = useTelegramWebApp();

  useEffect(() => {
    if (!webApp) return;

    const mainButton = webApp.MainButton;
    
    mainButton.setText(text);
    mainButton.onClick(onClick);
    
    if (options) {
      mainButton.setParams({
        text,
        color: options.color,
        text_color: options.textColor,
        is_active: options.isActive !== false,
        is_visible: options.show !== false,
      });
    }
    
    if (options?.show !== false) {
      mainButton.show();
    }

    return () => {
      mainButton.offClick(onClick);
      mainButton.hide();
    };
  }, [webApp, text, onClick, options]);
};

export const useHapticFeedback = () => {
  const { webApp } = useTelegramWebApp();

  return {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
      webApp?.HapticFeedback.impactOccurred(style);
    },
    notificationOccurred: (type: 'error' | 'success' | 'warning') => {
      webApp?.HapticFeedback.notificationOccurred(type);
    },
    selectionChanged: () => {
      webApp?.HapticFeedback.selectionChanged();
    },
  };
};