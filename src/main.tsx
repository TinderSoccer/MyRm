import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/organic.css';
import './styles/app.css';
import { App } from './App';
import { StoreProvider } from './store';
import { CloudProvider } from './cloud';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <CloudProvider>
        <App />
      </CloudProvider>
    </StoreProvider>
  </StrictMode>
);

// Offline shell + notifications. Dev skips it so Vite's hot reload isn't served from cache.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* offline support is a bonus */ }); });
}
