export const debugInitData = async () => {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) {
    console.warn('⚠️ initData отсутствует');
    return;
  }

  console.log('🔑 initData length:', initData.length);
  const BASE = 'https://targetx-back.farmhub.pro';

  const tests = [
    ['X-Telegram-Init-Data header', () => fetch(`${BASE}/api/tgapp/me`, {
      headers: { 'X-Telegram-Init-Data': initData, 'Content-Type': 'application/json' },
    })],
    ['Authorization: tma', () => fetch(`${BASE}/api/tgapp/me`, {
      headers: { 'Authorization': `tma ${initData}`, 'Content-Type': 'application/json' },
    })],
    ['query param ?initData=', () => fetch(`${BASE}/api/tgapp/me?initData=${encodeURIComponent(initData)}`)],
    ['Authorization: Bearer', () => fetch(`${BASE}/api/tgapp/me`, {
      headers: { 'Authorization': `Bearer ${initData}`, 'Content-Type': 'application/json' },
    })],
  ] as const;

  for (const [name, fn] of tests) {
    try {
      const r = await (fn as () => Promise<Response>)();
      const body = await r.text();
      console.log(`[${r.status}] ${name}:`, body.slice(0, 100));
      if (r.status === 200) {
        console.log('✅ РАБОЧИЙ ВАРИАНТ:', name);
      }
    } catch (e) {
      console.log(`[ERR] ${name}:`, e);
    }
  }
};