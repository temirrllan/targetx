import { createContext, useContext, type ReactNode } from 'react';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import type { TelegramWebApp } from '../types/telegram';

interface TelegramContextType {
  webApp: TelegramWebApp | null;
  isReady: boolean;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export const TelegramProvider = ({ children }: { children: ReactNode }) => {
  const { webApp, isReady } = useTelegramWebApp();

  return (
    <TelegramContext.Provider value={{ webApp, isReady }}>
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (context === undefined) {
    throw new Error('useTelegram must be used within TelegramProvider');
  }
  return context;
};