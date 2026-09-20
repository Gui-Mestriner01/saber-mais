import { useState, useEffect, useRef } from 'react';
import './Acessibilidade.css';

function MenuAcessibilidade() {
  const [aberto, setAberto] = useState(false);
  const [fonteDislexia, setFonteDislexia] = useState(false);
  
  // NOVO: Estado para a Leitura Mágica
  const [leituraMouse, setLeituraMouse] = useState(false); 
  const timerLeitura = useRef(null);

  // 1. Efeito da Fonte para Dislexia
  useEffect(() => {
    if (fonteDislexia) {
      document.body.classList.add('modo-fonte-dislexia');
    } else {
      document.body.classList.remove('modo-fonte-dislexia');
    }
  }, [fonteDislexia]);

  // 2. Efeito da Leitura ao Passar o Mouse (A Mágica acontece aqui!)
  useEffect(() => {
    const handleMouseOver = (e) => {
      if (!leituraMouse) return;

      // Procura se o mouse está em cima de um texto, botão ou link
      let elemento = e.target.closest('button, a, h1, h2, h3, h4, p, span, label, strong');

      if (elemento) {
        // Se a criança moveu o mouse rápido, cancela a leitura anterior
        if (timerLeitura.current) clearTimeout(timerLeitura.current);

        // Espera 400 milissegundos (menos de meio segundo) antes de falar
        // Isso evita que o PC leia tudo enquanto o mouse só está "de passagem"
        timerLeitura.current = setTimeout(() => {
          // Pega o texto do elemento
          const texto = elemento.innerText || elemento.title || elemento.getAttribute('aria-label');
          
          if (texto && texto.trim() !== '') {
            window.speechSynthesis.cancel(); // Para qualquer voz que já esteja falando
            
            const mensagem = new SpeechSynthesisUtterance(texto);
            mensagem.lang = 'pt-BR';
            mensagem.rate = 0.9;  // Velocidade suave
            mensagem.pitch = 1.2; // Voz um pouquinho mais aguda/animada

            // Tenta achar a voz mais humanizada instalada no PC
            const vozes = window.speechSynthesis.getVoices();
            const vozPreferida = vozes.find(v => v.lang.includes('pt-BR') && (v.name.includes('Google') || v.name.includes('Francisca') || v.name.includes('Luciana')));
            if (vozPreferida) mensagem.voice = vozPreferida;

            window.speechSynthesis.speak(mensagem);
          }
        }, 400); 
      }
    };

    const handleMouseOut = () => {
      // Se a criança tirou o mouse do botão antes dele começar a falar, desiste de falar
      if (timerLeitura.current) clearTimeout(timerLeitura.current);
    };

    // Ativa ou desativa os "olheiros" do mouse no site inteiro
    if (leituraMouse) {
      document.addEventListener('mouseover', handleMouseOver);
      document.addEventListener('mouseout', handleMouseOut);
    } else {
      window.speechSynthesis.cancel(); // Manda calar a boca se desligar a chavinha
    }

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      if (timerLeitura.current) clearTimeout(timerLeitura.current);
    };
  }, [leituraMouse]);


  return (
    <div className="menu-acessibilidade-container">
      
      {aberto && (
        <div className="menu-acessibilidade-painel">
          <h3 className="menu-acessibilidade-titulo">♿ Acessibilidade</h3>
          
          {/* Chavinha da Dislexia */}
          <div className="acessibilidade-opcao">
            <span className="acessibilidade-label">
              <span>🔤</span> Fonte Dislexia
            </span>
            <div 
              className={`toggle-switch ${fonteDislexia ? 'ativo' : ''}`}
              onClick={() => setFonteDislexia(!fonteDislexia)}
            >
              <div className="toggle-bolinha" />
            </div>
          </div>

          {/* NOVA: Chavinha da Leitura por Mouse */}
          <div className="acessibilidade-opcao">
            <span className="acessibilidade-label" title="Passe o mouse por cima dos textos para ouvir">
              <span>🗣️</span> Leitura pelo Mouse
            </span>
            <div 
              className={`toggle-switch ${leituraMouse ? 'ativo' : ''}`}
              onClick={() => setLeituraMouse(!leituraMouse)}
            >
              <div className="toggle-bolinha" />
            </div>
          </div>

        </div>
      )}

      <button 
        className="menu-acessibilidade-botao"
        onClick={() => setAberto(!aberto)}
        title="Menu de Acessibilidade"
      >
        {aberto ? '✖️' : '♿'}
      </button>

    </div>
  );
}

export default MenuAcessibilidade;