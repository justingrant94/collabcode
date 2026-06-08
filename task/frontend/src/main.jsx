/**
 * main.jsx — React bootstrap entry.
 *
 * Import order matters for the cascade:
 *   1. reset.css   — normalize browser defaults
 *   2. root.css    — design tokens (THE single source of truth)
 *   3. global.css  — element-level rules built from tokens
 *
 * App-level providers (Clerk, Router) live inside <App />.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/reset.css';
import './styles/root.css';
import './styles/global.css';

import { App } from './App.jsx';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
