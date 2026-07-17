import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// StrictMode disabled: it double-mounts in dev and amplifies auth callback flips, causing admin panel to jump/freeze.
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
