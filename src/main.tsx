import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { debugInitData } from './utils/debugInitData.tsx';

// После createRoot(...)
if (window.Telegram?.WebApp) {
  debugInitData();
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
