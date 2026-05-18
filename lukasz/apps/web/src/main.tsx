import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Howler } from 'howler';
import { config } from '@/lib/config';
import { log } from '@/lib/log';
import { App } from './app';
import './app.css';

async function enableMocking() {
  if (!config.USE_MSW) return;
  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
  log.info('MSW worker started');
}

function bootstrap() {
  Howler.mute(true);
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Missing #root element in index.html');
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

enableMocking()
  .catch((err) => log.error('MSW failed to start', { err }))
  .then(bootstrap);
