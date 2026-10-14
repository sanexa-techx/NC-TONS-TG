import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { UIShowcase } from './pages/UIShowcase.js';
import './index.css';

// Render UIShowcase when ?showcase=1 is in the URL (non-breaking)
const isShowcase = new URLSearchParams(window.location.search).get('showcase') === '1';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isShowcase ? <UIShowcase /> : <App />}
  </React.StrictMode>
);
