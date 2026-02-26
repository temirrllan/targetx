import { useEffect, useMemo, useRef } from 'react';
import { useTelegram } from './useTelegram';

export const useTelegramWebApp = () => useTelegram();

export const useBackButton = (onClick: () => void, show = true) => {
  const { webApp } = useTelegram();
  const onClickRef = useRef(onClick);

  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    if (!webApp) return;

    const backButton = webApp.BackButton;
    const handler = () => onClickRef.current();

    if (show) {
      backButton.show();
      backButton.onClick(handler);
    } else {
      backButton.hide();
    }

    return () => {
      backButton.offClick(handler);
      backButton.hide();
    };
  }, [webApp, show]);
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
  const { webApp } = useTelegram();
  const onClickRef = useRef(onClick);
  const show = options?.show !== false;
  const color = options?.color;
  const textColor = options?.textColor;
  const isActive = options?.isActive !== false;

  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    if (!webApp) return;

    const mainButton = webApp.MainButton;
    const handler = () => onClickRef.current();

    mainButton.setText(text);
    mainButton.onClick(handler);
    mainButton.setParams({
      text,
      color,
      text_color: textColor,
      is_active: isActive,
      is_visible: show,
    });

    if (show) {
      mainButton.show();
    } else {
      mainButton.hide();
    }

    return () => {
      mainButton.offClick(handler);
      mainButton.hide();
    };
  }, [webApp, text, show, color, textColor, isActive]);
};

export const useHapticFeedback = () => {
  const { webApp } = useTelegram();

  return useMemo(
    () => ({
      impactOccurred: (
        style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium'
      ) => {
        webApp?.HapticFeedback.impactOccurred(style);
      },
      notificationOccurred: (type: 'error' | 'success' | 'warning') => {
        webApp?.HapticFeedback.notificationOccurred(type);
      },
      selectionChanged: () => {
        webApp?.HapticFeedback.selectionChanged();
      },
    }),
    [webApp]
  );
};
