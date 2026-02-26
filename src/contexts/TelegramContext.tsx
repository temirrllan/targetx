import { useEffect, useMemo, type ReactNode } from 'react';
import { TelegramContext } from './telegramContextStore';

export const TelegramProvider = ({ children }: { children: ReactNode }) => {
  const webApp = useMemo(
    () => (typeof window === 'undefined' ? null : window.Telegram?.WebApp ?? null),
    []
  );
  const isReady = webApp !== null;

  useEffect(() => {
    if (!webApp) {
      return;
    }

    webApp.ready();
    webApp.expand();
    webApp.headerColor = '#020617';
    webApp.backgroundColor = '#020617';
  }, [webApp]);

  const value = useMemo(
    () => ({ webApp, isReady }),
    [webApp, isReady]
  );

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
};
