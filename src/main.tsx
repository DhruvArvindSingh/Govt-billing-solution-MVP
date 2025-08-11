import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for PWA (auto-updates)
registerSW({ immediate: true });