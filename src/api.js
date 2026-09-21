/* ==========================================================================
   ENDEREÇO DO BACKEND

   Antes cada tela tinha "http://localhost:3001" escrito na mão. Isso só
   funciona no próprio computador: no celular, "localhost" é o celular.

   Agora o endereço segue o da página. Abriu o site em
   http://192.168.0.15:5173 → a API vira http://192.168.0.15:3001.
   No computador continua http://localhost:3001, como sempre.

   Publicado (npm run build), o site e a API ficam no MESMO endereço
   (o server.js entrega os dois), então a API é a própria origem da página.
   Se um dia o backend for para outro domínio, crie no .env do front:
   VITE_API_URL=https://api.meusite.com
   ========================================================================== */
export const API =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001` // npm run dev: backend na porta 3001
    : window.location.origin);                                          // publicado: site e API no mesmo endereço
