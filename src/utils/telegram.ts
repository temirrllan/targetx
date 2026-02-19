export const getTelegramUser = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp.initDataUnsafe.user;
  }
  return null;
};

export const isTelegramWebApp = () => {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp;
};

export const closeTelegramWebApp = () => {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.close();
  }
};