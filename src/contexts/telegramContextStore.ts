import { createContext } from 'react';
import type { TelegramWebApp } from '../types/telegram';

export interface TelegramContextType {
  webApp: TelegramWebApp | null;
  isReady: boolean;
}

export const TelegramContext = createContext<TelegramContextType | undefined>(
  undefined
);
