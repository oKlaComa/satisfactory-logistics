import 'core-js/stable/object/has-own';
import 'core-js/stable/set/difference';

import '@mantine/tiptap/styles.css';
import * as Sentry from '@sentry/react';
import '@xyflow/react/dist/style.css';
import { setAutoFreeze } from 'immer';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthSessionManager } from './auth/AuthSessionManager';

setAutoFreeze(false); // TODO Bug on change solver

Sentry.init({
  dsn: SENTRY_DSN,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      maskAllInputs: false,
    }),
  ],
  tracesSampleRate: 1.0,
  maxBreadcrumbs: 50,
  replaysSessionSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
  replaysOnErrorSampleRate: 1.0,
  debug: import.meta.env.DEV,
  enabled: !import.meta.env.DEV,
});

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AuthSessionManager />
    <App />
  </StrictMode>,
);
