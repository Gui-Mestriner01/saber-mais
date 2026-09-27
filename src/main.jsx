import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ligarTravaInspecionar } from './travaInspecionar.js'

/* O provedor do "Entrar com Google" saiu daqui: ele baixava o script do
   Google em TODA visita, inclusive nas telas do aluno, que nem usam isso.
   Agora ele fica só dentro da tela de login do professor. */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
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
