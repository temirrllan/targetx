/**
 * Получает токен для авторизации
 * Возвращает RAW initData из Telegram WebApp (не base64)
 */
export const getAuthToken = (): string => {
  // Проверяем наличие Telegram WebApp
  if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) {
    const initData = window.Telegram.WebApp.initData;
    if (initData) {
      console.log("Используется токен из Telegram WebApp");
      return initData; // Возвращаем RAW initData, не base64!
    }
  }

  // Тестовый токен для разработки (декодированный из base64)
  const testToken = "query_id=AAETmm5zAAAAABOabnNL2990&user=%7B%22id%22%3A1936628243%2C%22first_name%22%3A%22%D0%9A%D0%B0%D1%80%D0%BF%D0%BE%D0%B2%20%D0%9A%D0%BE%D0%BD%D1%81%D1%82%D0%B0%D0%BD%D1%82%D0%B8%D0%BD%22%2C%22last_name%22%3A%22%22%2C%22username%22%3A%22K_01001101%22%2C%22language_code%22%3A%22ru%22%2C%22allows_write_to_pm%22%3Atrue%7D&auth_date=1721317897&hash=e6fa444a4f5e0205e1fb82f950b3ac90e991f0026f0cfa92b6ac0db9d66d2f0c";
  
  console.warn("Используется тестовый токен для разработки");
  return testToken;
};

/**
 * Проверяет, доступен ли Telegram WebApp
 */
export const isTelegramWebAppAvailable = (): boolean => {
  return typeof window !== "undefined" && !!window.Telegram?.WebApp;
};

/**
 * Инициализирует Telegram WebApp
 */
export const initTelegramWebApp = (): void => {
  if (isTelegramWebAppAvailable() && window.Telegram) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
    
    // Логируем initData для отладки
    if (window.Telegram.WebApp.initData) {
      console.log("Telegram WebApp initialized with initData");
    }
  }
};

// Типы для Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
          };
          auth_date?: number;
          hash?: string;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
      };
    };
  }
}