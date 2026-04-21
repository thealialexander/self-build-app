import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import * as LucideIcons from 'lucide-react';

window.React = React;
window.LucideIcons = LucideIcons;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
