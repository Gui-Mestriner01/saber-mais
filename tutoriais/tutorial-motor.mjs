/* Motor de gravação dos tutoriais do Saber+.
   Abre o navegador gravando vídeo, mostra uma faixa de legenda embaixo,
   desenha um anel no lugar que está sendo clicado e anda devagar, para
   quem está aprendendo conseguir acompanhar. */
import { chromium } from 'playwright';
import fs from 'fs';

export const SITE = 'http://localhost:3999';
export const PASTA = '/tmp/claude-0/videos';

/* roda em toda página carregada: cria a faixa de legenda e os efeitos */
const enfeites = () => {
  const montar = () => {
    if (document.getElementById('tut-legenda')) return;

    const faixa = document.createElement('div');
    faixa.id = 'tut-legenda';
    faixa.style.cssText = [
      'position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:2147483646',
      'padding:34px 40px 16px', 'text-align:center', 'pointer-events:none',
      'font:700 21px/1.35 Nunito,system-ui,-apple-system,Segoe UI,sans-serif',
      'color:#fff', 'opacity:0', 'transition:opacity .3s ease',
      'background:linear-gradient(to top, rgba(10,14,28,.95) 0%, rgba(10,14,28,.86) 60%, rgba(10,14,28,0) 100%)',
      'text-shadow:0 2px 12px rgba(0,0,0,.7)',
    ].join(';');
    document.body.appendChild(faixa);

    const marca = document.createElement('div');
    marca.id = 'tut-marca';
    marca.style.cssText = [
      'position:fixed', 'top:14px', 'right:18px', 'z-index:2147483646',
      'font:800 15px/1 Nunito,system-ui,sans-serif', 'color:#fff',
      'background:rgba(88,80,236,.92)', 'padding:8px 14px', 'border-radius:999px',
      'pointer-events:none', 'letter-spacing:.3px', 'opacity:0',
      'box-shadow:0 4px 14px rgba(0,0,0,.35)',
    ].join(';');
    document.body.appendChild(marca);

    const estilo = document.createElement('style');
    estilo.textContent = `
      @keyframes tutAnel { 0%{transform:scale(.6);opacity:0} 25%{transform:scale(1);opacity:1} 100%{transform:scale(1.35);opacity:0} }
      .tut-anel { position:fixed; z-index:2147483645; border:4px solid #ffd54f; border-radius:14px;
                  box-shadow:0 0 0 4px rgba(255,213,79,.28), 0 0 22px rgba(255,213,79,.6);
                  pointer-events:none; animation:tutAnel 1.1s ease-out forwards; }
      #tut-legenda b { color:#ffd54f }
      /* deixa espaço para a legenda quando a página rola até um elemento */
      * { scroll-margin-bottom: 130px; scroll-margin-top: 70px; }
    `;
    document.head.appendChild(estilo);

    /* legenda e título guardados na sessão, para sobreviver à troca de página */
    const guardada = sessionStorage.getItem('tutLegenda');
    if (guardada) { faixa.innerHTML = guardada; faixa.style.opacity = '1'; }
    const titulo = sessionStorage.getItem('tutTitulo');
    if (titulo) { marca.textContent = titulo; marca.style.opacity = '1'; }
  };

  /* a tela de pintura usa o canto de cima à direita para Limpar/Enviar:
     ali o selo desce para o canto de baixo à esquerda, sem tapar botão */
  const acomodar = () => {
    const m = document.getElementById('tut-marca');
    if (!m) return;
    const pintando = !!document.querySelector('.pint-tela');
    m.style.top = pintando ? 'auto' : '14px';
    m.style.bottom = pintando ? '96px' : 'auto';
    m.style.right = pintando ? 'auto' : '18px';
    m.style.left = pintando ? '14px' : 'auto';
  };

  window.__leg = (texto) => {
    const f = document.getElementById('tut-legenda');
    if (!f) return;
    if (texto) { sessionStorage.setItem('tutLegenda', texto); f.innerHTML = texto; f.style.opacity = '1'; }
    else { sessionStorage.removeItem('tutLegenda'); f.style.opacity = '0'; }
  };
  window.__titulo = (texto) => {
    const m = document.getElementById('tut-marca');
    if (!m) return;
    sessionStorage.setItem('tutTitulo', texto);
    m.textContent = texto; m.style.opacity = '1';
  };
  window.__anel = (x, y, l, a) => {
    const d = document.createElement('div');
    d.className = 'tut-anel';
    d.style.left = (x - 6) + 'px'; d.style.top = (y - 6) + 'px';
    d.style.width = (l + 12) + 'px'; d.style.height = (a + 12) + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1200);
  };

  const tique = () => { montar(); acomodar(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tique);
  else tique();
  // o React às vezes troca o body inteiro; reconfere de vez em quando
  setInterval(tique, 700);
};

export async function gravar({ nome, titulo, largura = 1280, altura = 720 }) {
  fs.mkdirSync(`${PASTA}/${nome}`, { recursive: true });
  const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await navegador.newContext({
    viewport: { width: largura, height: altura },
    recordVideo: { dir: `${PASTA}/${nome}`, size: { width: largura, height: altura } },
    deviceScaleFactor: 1,
    hasTouch: altura > largura,
    isMobile: altura > largura,
  });
  await ctx.addInitScript(enfeites);
  const pg = await ctx.newPage();

  const esperar = ms => pg.waitForTimeout(ms);
  /* tempo de leitura: ~55ms por caractere, entre 1,8s e 6s */
  const leitura = t => Math.min(6000, Math.max(1800, t.replace(/<[^>]+>/g, '').length * 55));

  /* janelas de confirmação do navegador: aceitar, senão o Playwright cancela */
  pg.on('dialog', d => d.accept().catch(() => {}));

  const api = {
    pg, ctx, navegador,
    async marca() { await pg.evaluate(t => window.__titulo && window.__titulo(t), titulo).catch(() => {}); },
    async diz(texto, extra = 0) {
      await pg.evaluate(t => window.__leg && window.__leg(t), texto).catch(() => {});
      await esperar(leitura(texto) + extra);
    },
    async limpaLegenda() { await pg.evaluate(() => window.__leg && window.__leg('')).catch(() => {}); },
    async aponta(alvo) {
      const el = typeof alvo === 'string' ? pg.locator(alvo).first() : alvo;
      await el.scrollIntoViewIfNeeded().catch(() => {});
      await esperar(260);
      const cx = await el.boundingBox().catch(() => null);
      if (cx) await pg.evaluate(([x, y, l, a]) => window.__anel && window.__anel(x, y, l, a), [cx.x, cx.y, cx.width, cx.height]).catch(() => {});
      await esperar(700);
      return el;
    },
    async clica(alvo, pausa = 900) {
      const el = await api.aponta(alvo);
      await el.click();
      await esperar(pausa);
    },
    async escreve(alvo, texto, pausa = 600) {
      const el = await api.aponta(alvo);
      await el.click();
      await el.fill('');
      await el.type(texto, { delay: 55 });
      await esperar(pausa);
    },
    async pausa(ms) { await esperar(ms); },
    /* fecha a festinha de insígnia, se aparecer */
    async festa() {
      for (let i = 0; i < 4; i++) {
        const b = pg.locator('.festa-insignia button').first();
        if (await b.isVisible().catch(() => false)) { await b.click(); await esperar(500); } else break;
      }
    },
    async fim() {
      await api.limpaLegenda();
      await esperar(600);
      await ctx.close();
      await navegador.close();
      const arquivos = fs.readdirSync(`${PASTA}/${nome}`).filter(f => f.endsWith('.webm'));
      return `${PASTA}/${nome}/${arquivos[0]}`;
    },
  };
  return api;
}
