import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ligarTravaInspecionar } from './travaInspecionar.js'

import { GoogleOAuthProvider } from '@react-oauth/google';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="17269757270-gk04h1b82ljnu5ep0fdnctn7gru3aca1.apps.googleusercontent.com">
      
      <App />
      
    </GoogleOAuthProvider>
  </StrictMode>,
)

/* No site publicado, nada de mensagens de depuração no console do navegador. */
if (import.meta.env.PROD) {
  ['log', 'info', 'debug', 'table', 'dir'].forEach(metodo => { console[metodo] = () => {}; });
  ligarTravaInspecionar();
}

/* App instalável: o service worker só entra no site "de verdade" (npm run
   build / publicado). No npm run dev ele atrapalharia o recarregamento. */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* sem app instalável, o site segue normal */ });
  });
}
