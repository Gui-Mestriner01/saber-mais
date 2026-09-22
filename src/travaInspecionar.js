// Trava do "Inspecionar" (DevTools). Só roda no site publicado (npm run build).
//
// O navegador sempre deixa o dono do computador abrir as ferramentas de
// desenvolvedor. Esta trava não consegue impedir isso. O que ela faz é tornar
// o uso inútil dentro do Saber+:
//  1. bloqueia o botão direito e os atalhos (F12, Ctrl+Shift+I/J/C/K, Ctrl+U, Ctrl+S);
//  2. prende o DevTools num "debugger" que se repete sem parar, então ele
//     fica travado e não dá para mexer nas abas;
//  3. assim que o DevTools abre, esconde a tela inteira e encerra a sessão
//     (aluno e professor): os crachás somem e é preciso entrar de novo.
// (Medir o tamanho da janela dava alarme falso com zoom do navegador e barra
// lateral do Edge, então a detecção usa só o debugger, que não erra.)
// A proteção de verdade continua no servidor: senhas e gabaritos não saem de
// lá, então mesmo quem passar pela trava não encontra nada.

const LIMITE_PAUSA  = 120;   // ms: o "debugger" só demora assim com o DevTools aberto

let bloqueado = false;
let sessaoEncerrada = false;
let aviso = null;

function encerrarSessao() {
  if (sessaoEncerrada) return;
  sessaoEncerrada = true;
  try {
    localStorage.removeItem('token');
    ['idUsuario', 'nomeUsuario', 'tipoUsuario', 'alunoTemporario', 'jogadorLive']
      .forEach(chave => localStorage.removeItem(chave));
    sessionStorage.clear();
  } catch { /* navegador sem armazenamento */ }
}

function mostrarAviso() {
  if (bloqueado) return;
  bloqueado = true;
  const raiz = document.getElementById('root');
  if (raiz) raiz.style.display = 'none';

  aviso = document.createElement('div');
  aviso.setAttribute('role', 'alert');
  aviso.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:2147483647', 'display:flex',
    'flex-direction:column', 'align-items:center', 'justify-content:center',
    'gap:14px', 'padding:24px', 'text-align:center', 'background:#0F1B2D',
    'color:#fff', 'font-family:system-ui,sans-serif'
  ].join(';');
  aviso.innerHTML = `
    <div style="font-size:48px">🔒</div>
    <h1 style="margin:0;font-size:24px">Área protegida</h1>
    <p style="margin:0;max-width:420px;line-height:1.5;color:#C9D6E8">
      As ferramentas de desenvolvedor não podem ser usadas no Saber+.
      Por segurança, sua sessão foi encerrada. Feche o "Inspecionar" e entre de novo.
    </p>
    <button style="margin-top:8px;padding:12px 22px;border:0;border-radius:12px;
      background:#1A6FC4;color:#fff;font-size:16px;font-weight:600;cursor:pointer">
      Voltar ao início
    </button>`;
  aviso.querySelector('button').onclick = () => { window.location.href = '/'; };
  document.body.appendChild(aviso);
}

// 1. Botão direito e atalhos
function bloquearAtalhos(e) {
  const k = (e.key || '').toLowerCase();
  const ctrl = e.ctrlKey || e.metaKey;
  const combinacao =
    k === 'f12' ||
    (ctrl && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) ||
    (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(k)) ||   // Mac
    (ctrl && ['u', 's'].includes(k));
  if (combinacao) {
    e.preventDefault();
    e.stopPropagation();
  }
}

// 2. Armadilha do debugger: com o DevTools aberto, esta linha para o código
const armadilha = new Function('debugger');

function verificar() {
  const inicio = performance.now();
  armadilha();
  const pausou = performance.now() - inicio > LIMITE_PAUSA;

  if (pausou) {
    encerrarSessao();
    mostrarAviso();
  }
}

export function ligarTravaInspecionar() {
  // Nos campos de texto o botão direito continua (para colar, corrigir etc.)
  document.addEventListener('contextmenu', e => {
    if (!e.target?.closest?.('input, textarea')) e.preventDefault();
  }, true);
  document.addEventListener('keydown', bloquearAtalhos, true);
  document.addEventListener('dragstart', e => {
    if (e.target?.tagName === 'IMG') e.preventDefault();
  }, true);

  verificar();
  setInterval(verificar, 800);
}
