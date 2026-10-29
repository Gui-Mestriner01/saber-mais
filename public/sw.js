/* ==========================================================================
   SERVICE WORKER DO SABER+

   É ele que deixa o Saber+ ser "instalado" no celular e abrir rápido.
   Regras simples:
   - Páginas (navegação): tenta a internet primeiro; sem internet, mostra a
     última versão guardada do app (a tela abre, e avisa quando a API falhar).
   - Arquivos do app (JS, CSS, imagens, avatares, ícones): guardados na
     primeira vez e servidos do celular dali em diante. Os JS/CSS do Vite têm
     um código no nome (index-a1b2c3.js), então versão nova = arquivo novo.
   - A API (porta 3001 ou outro domínio) NUNCA passa pelo cache: notas,
     pontos e partidas ao vivo são sempre na hora.

   Mudou este arquivo? Troque a VERSAO para os celulares limparem o cache.
   ========================================================================== */
// v3 (29/10/2026): a logo do app mudou.
//
// Trocar o ARQUIVO do ícone não basta: ele é servido com cache de um ano e o
// nome continuou o mesmo, então o celular, o navegador e o CDN seguiriam
// entregando a logo antiga. Pior: no Android o ícone da tela inicial é uma
// cópia feita na hora de instalar, e o Chrome só refaz essa cópia quando vê
// o MANIFESTO mudar — como os nomes não mudaram, ele não via mudança nenhuma.
//
// Por isso todo endereço de ícone leva "?v=2" (aqui, no index.html, no
// manifest.webmanifest e no BotaoInstalar). Mudou de endereço = arquivo novo
// para todo mundo. Trocou a logo de novo? Suba o número do ?v= e a VERSAO.
const VERSAO = 'saber-v3';
// '/' ficou de fora de propósito: era ele que pedia a raiz com 'Accept: */*'
// e trazia o 404 do Express para dentro do cache. A tela offline usa o
// /index.html, que o próprio evento de navegação guarda.
const ESSENCIAIS = ['/index.html', '/manifest.webmanifest', '/icones/icone-192.png?v=2', '/icones/icone-512.png?v=2'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ESSENCIAIS)));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;

  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;   // API e sites de fora: direto na rede

  // Abrir uma página do app
  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put('/index.html', copia));
          return resposta;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Arquivos do app
  if (/^\/(assets|avatares|ilustracoes|imagens|icones)\//.test(url.pathname)) {
    evento.respondWith(
      caches.match(pedido).then((guardado) => guardado || fetch(pedido).then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put(pedido, copia));
        }
        return resposta;
      }))
    );
  }
});
