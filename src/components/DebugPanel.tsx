import { useState } from 'react';

const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const testConnection = async () => {
    setTestResult('Тестирование...');
    
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setTestResult('❌ Нет initData');
      return;
    }

    const headers = [
      { name: 'X-Telegram-Init-Data', value: initData },
      { name: 'Telegram-Init-Data', value: initData },
      { name: 'initData', value: initData },
      { name: 'Authorization', value: initData },
      { name: 'Authorization', value: `Bearer ${initData}` },
      { name: 'Authorization', value: `tma ${initData}` },
    ];

    const results: string[] = [];

    for (const header of headers) {
      try {
        const response = await fetch('https://targetx-back.farmhub.pro/api/tgapp/channels', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            [header.name]: header.value,
          },
        });

        const status = response.status;
        const text = await response.text();
        
        results.push(`${header.name}: ${status} - ${text.substring(0, 100)}`);
        
        if (response.ok) {
          setTestResult(`✅ РАБОТАЕТ!\nЗаголовок: ${header.name}\nЗначение: ${header.value.substring(0, 50)}...`);
          return;
        }
      } catch (error) {
        results.push(`${header.name}: Error - ${error}`);
      }
    }

    setTestResult('❌ Ни один вариант не сработал:\n\n' + results.join('\n\n'));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-amber-500/20 p-3 text-amber-300 shadow-lg border border-amber-500/30"
      >
        🔧
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-3xl border border-slate-800/70 bg-slate-900/95 p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-100">Панель отладки</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Telegram WebApp</h3>
            <div className="space-y-1 text-xs font-mono text-slate-400">
              <p>WebApp доступен: {window.Telegram?.WebApp ? '✅' : '❌'}</p>
              <p>InitData доступен: {window.Telegram?.WebApp?.initData ? '✅' : '❌'}</p>
              <p>Длина initData: {window.Telegram?.WebApp?.initData?.length || 0}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">InitData (первые 100 символов)</h3>
            <pre className="text-xs font-mono text-slate-400 overflow-x-auto">
              {window.Telegram?.WebApp?.initData?.substring(0, 100) || 'Нет данных'}...
            </pre>
          </div>

          <button
            onClick={testConnection}
            className="w-full rounded-full border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-sm uppercase tracking-wider text-blue-100 transition hover:border-blue-500/50 hover:bg-blue-500/20"
          >
            Тестировать все варианты заголовков
          </button>

          {testResult && (
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Результат теста</h3>
              <pre className="text-xs font-mono text-slate-400 whitespace-pre-wrap">
                {testResult}
              </pre>
            </div>
          )}

          <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">User данные</h3>
            <pre className="text-xs font-mono text-slate-400 overflow-x-auto">
              {JSON.stringify(window.Telegram?.WebApp?.initDataUnsafe?.user, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;