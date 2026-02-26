import { useContext } from 'react';
import { TelegramContext } from '../contexts/telegramContextStore';

export const useTelegram = () => {
  const context = useContext(TelegramContext);

  if (context === undefined) {
    throw new Error('useTelegram must be used within TelegramProvider');
  }

  return context;
};
