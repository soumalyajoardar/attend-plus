import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initTheme } from './utils/theme';

// Apply the saved/preferred theme before the first paint so there's no
// flash of the wrong theme on any page.
initTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
