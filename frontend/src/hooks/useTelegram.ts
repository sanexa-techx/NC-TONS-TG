import { useEffect, useMemo } from 'react';

export function useTelegram() {
  const tg = useMemo(() => {
    return (window as any).Telegram?.WebApp || null;
  }, []);

  useEffect(() => {
    if (tg) {
      tg.ready?.();
      tg.expand?.();
      // Set header color to match dark cyber UI
      try {
        tg.setHeaderColor?.('#090c12');
        tg.setBackgroundColor?.('#090c12');
      } catch (e) {
        // Ignored if older client
      }
    }
  }, [tg]);

  const haptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    if (!tg?.HapticFeedback) return;
    try {
      if (type === 'success' || type === 'warning' || type === 'error') {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    } catch (e) {
      // Ignored
    }
  };

  const openLink = (url: string) => {
    if (tg?.openTelegramLink && url.includes('t.me')) {
      tg.openTelegramLink(url);
    } else if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return {
    tg,
    user: tg?.initDataUnsafe?.user || null,
    isAvailable: Boolean(tg?.initData),
    haptic,
    openLink,
  };
}
