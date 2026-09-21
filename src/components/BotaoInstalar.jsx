import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

/* ==========================================================================
   BOTÃO "INSTALAR O SABER+"

   - Android / Chrome / Edge: o navegador avisa que o site pode virar app
     (evento beforeinstallprompt). Guardamos esse aviso e mostramos o botão;
     ao tocar, aparece a janelinha oficial de instalar.
   - iPhone / iPad (Safari): não existe esse evento. Mostramos a dica
     "Compartilhar → Adicionar à Tela de Início".
   - Já está instalado (aberto como app)? Não mostra nada.

   Observação: o navegador só oferece instalar quando o site está em HTTPS
   (ou em localhost). Pelo IP da rede (http://192.168...) o site funciona,
   mas o botão não aparece — isso é regra do navegador.
   ========================================================================== */

const CHAVE_FECHOU = 'saberPlusInstalarFechado';

function jaInstalado() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function ehIOS() {
  const ua = window.navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
}

function BotaoInstalar() {
  const [aviso, setAviso] = useState(null);
  const [fechado, setFechado] = useState(() => {
    try { return sessionStorage.getItem(CHAVE_FECHOU) === '1'; } catch { return false; }
  });

  useEffect(() => {
    const guardar = (e) => { e.preventDefault(); setAviso(e); };
    const instalou = () => setAviso(null);
    window.addEventListener('beforeinstallprompt', guardar);
    window.addEventListener('appinstalled', instalou);
    return () => {
      window.removeEventListener('beforeinstallprompt', guardar);
      window.removeEventListener('appinstalled', instalou);
    };
  }, []);

  if (fechado || jaInstalado()) return null;

  const fechar = () => {
    setFechado(true);
    try { sessionStorage.setItem(CHAVE_FECHOU, '1'); } catch { /* tudo bem */ }
  };

  if (aviso) {
    const instalar = async () => {
      aviso.prompt();
      await aviso.userChoice.catch(() => null);
      setAviso(null);
    };
    return (
      <div className="instalar-app" role="region" aria-label="Instalar o aplicativo">
        <img src="/icones/icone-192.png" alt="" />
        <p><strong>Saber+ no celular</strong>Instale e abra direto da tela inicial.</p>
        <button className="instalar-app-btn" onClick={instalar}>
          <Download size={16} strokeWidth={2.2} /> Instalar
        </button>
        <button className="instalar-app-fechar" onClick={fechar} aria-label="Agora não">
          <X size={16} strokeWidth={2.2} />
        </button>
      </div>
    );
  }

  if (ehIOS()) {
    return (
      <div className="instalar-app" role="region" aria-label="Como instalar no iPhone">
        <img src="/icones/icone-192.png" alt="" />
        <p>
          <strong>Saber+ na tela inicial</strong>
          Toque em <Share size={14} strokeWidth={2.2} aria-label="Compartilhar" /> e depois em
          “Adicionar à Tela de Início”.
        </p>
        <button className="instalar-app-fechar" onClick={fechar} aria-label="Fechar dica">
          <X size={16} strokeWidth={2.2} />
        </button>
      </div>
    );
  }

  return null;
}

export default BotaoInstalar;
